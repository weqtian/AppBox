use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};

/// 处理退出选择命令
///
/// 前端通过 `invoke("execute_quit_choice", { choice })` 调用：
/// - "quit": 直接退出应用
/// - "minimize": 隐藏窗口到系统托盘
#[tauri::command]
fn execute_quit_choice(app: tauri::AppHandle, choice: String) {
    match choice.as_str() {
        "quit" => {
            app.exit(0);
        }
        "minimize" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
        }
        _ => {}
    }
}

/// 更新托盘菜单文本（国际化）
///
/// 前端在语言切换时调用此命令，传入翻译后的菜单文本。
/// 重建整个托盘菜单以更新显示文本。
#[tauri::command]
fn update_tray_menu(
    app: tauri::AppHandle,
    show_text: String,
    about_text: String,
    quit_text: String,
) {
    // 重建菜单项（使用翻译后的文本）
    let show_item = match MenuItem::with_id(&app, "show", &show_text, true, None::<&str>) {
        Ok(item) => item,
        Err(e) => {
            eprintln!("Failed to create show menu item: {}", e);
            return;
        }
    };
    let about_item = match MenuItem::with_id(&app, "about", &about_text, true, None::<&str>) {
        Ok(item) => item,
        Err(e) => {
            eprintln!("Failed to create about menu item: {}", e);
            return;
        }
    };
    let sep = match PredefinedMenuItem::separator(&app) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Failed to create separator: {}", e);
            return;
        }
    };
    let quit_item = match MenuItem::with_id(&app, "quit", &quit_text, true, None::<&str>) {
        Ok(item) => item,
        Err(e) => {
            eprintln!("Failed to create quit menu item: {}", e);
            return;
        }
    };

    let menu = match Menu::with_items(&app, &[&show_item, &sep, &about_item, &sep, &quit_item]) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("Failed to create menu: {}", e);
            return;
        }
    };

    // 通过 ID 获取托盘图标并更新菜单
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_menu(Some(menu));
    }
}

/// 应用主入口
///
/// 注册所有 Tauri 插件、创建系统托盘、设置窗口关闭拦截。
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![execute_quit_choice, update_tray_menu])
        .setup(|app| {
            // 创建托盘菜单项（初始为英文，前端加载后会调用 update_tray_menu 更新）
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let about_item = MenuItem::with_id(app, "about", "About AppBox", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &sep, &about_item, &sep, &quit_item])?;

            // 安全获取默认窗口图标
            let icon = match app.default_window_icon() {
                Some(icon) => icon.clone(),
                None => {
                    eprintln!("Warning: No default window icon configured");
                    return Ok(());
                }
            };

            // 创建系统托盘图标（带 ID，以便后续通过 ID 获取并更新）
            let _tray = TrayIconBuilder::with_id("main")
                .icon(icon)
                .menu(&menu)
                .tooltip("AppBox")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "about" => {
                        // 关于：显示版本信息，emit 到前端弹出对话框
                        let version = env!("CARGO_PKG_VERSION");
                        let _ = app.emit("show-about", version);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // 左键点击托盘图标：显示并聚焦窗口
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        // 拦截窗口关闭事件：阻止直接关闭，改为发送事件让前端显示确认对话框
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.emit("quit-requested", ());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
