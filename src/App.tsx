/**
 * 应用主组件
 *
 * 负责整体布局和页面路由：
 * - 左侧边栏：工具分组导航（数据工具 / 图片工具）+ 语言切换
 * - 右侧内容区：根据活跃标签页渲染对应的工具页面
 * - 退出确认对话框：拦截窗口关闭事件
 * - 系统托盘菜单国际化：语言切换时同步更新托盘菜单文本
 * - 关于对话框：通过系统托盘"关于"菜单触发
 *
 * 导航采用条件渲染（非 React Router），各页面组件在切换时重新挂载。
 *
 * @module App
 */

import URLCoderPage from "@/pages/URLCoderPage";
import UUIDGeneratorPage from "@/pages/UUIDGeneratorPage";
import ImageCompressorPage from "@/pages/ImageCompressorPage";
import ImageFormatConverterPage from "@/pages/ImageFormatConverterPage";
import JwtParserPage from "@/pages/JwtParserPage";
import JsonFormatterPage from "@/pages/JsonFormatterPage";
import VideoFrameExtractorPage from "@/pages/VideoFrameExtractorPage";
import SettingsPage from "@/pages/SettingsPage";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LinkIcon, FingerprintIcon, ImageDownIcon, ArrowRightLeftIcon, KeyRoundIcon, BracesIcon, VideoIcon, SettingsIcon, BoxIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { I18nProvider, useTranslation, type Locale } from "@/i18n";
import { QuitConfirmDialog, type QuitChoice } from "@/components/QuitConfirmDialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

/**
 * 更新系统托盘菜单的国际化文本
 *
 * 调用 Rust 后端的 update_tray_menu 命令，
 * 将前端的翻译文本同步到系统托盘菜单。
 */
async function syncTrayMenu(_locale: Locale, t: (key: string) => string) {
  try {
    await invoke("update_tray_menu", {
      showText: t("tray.showWindow"),
      aboutText: `${t("tray.about")} (v${__APP_VERSION__})`,
      quitText: t("tray.quit"),
    });
  } catch {
    // 纯浏览器环境下调用会失败，静默忽略
  }
}

/**
 * 主应用组件
 *
 * 包含侧边栏导航、内容区域和退出对话框。
 * 必须在 I18nProvider 内部使用（由 AppContent 包裹）。
 */
function App() {
  const { t, locale, dir } = useTranslation();
  const [activeTab, setActiveTab] = useState("url");
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);

  // 监听 Rust 后端发送的退出请求事件（窗口关闭时触发）
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.listen("quit-requested", () => {
      setShowQuitDialog(true);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // 监听系统托盘"关于"事件
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.listen<string>("show-about", () => {
      setShowAboutDialog(true);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // 语言切换时同步更新系统托盘菜单文本
  useEffect(() => {
    syncTrayMenu(locale, t as (key: string) => string);
  }, [locale, t]);

  /** 处理退出对话框的用户选择 */
  const handleQuitChoice = useCallback((choice: QuitChoice) => {
    setShowQuitDialog(false);
    if (choice !== "cancel") {
      invoke("execute_quit_choice", { choice });
    }
  }, []);

  return (
    <TooltipProvider>
      <SidebarProvider>
        {/* 侧边栏：RTL 模式下自动切换到右侧 */}
        <Sidebar side={dir === "rtl" ? "right" : "left"}>
          <SidebarContent>
            {/* 数据工具分组 */}
            <SidebarGroup>
              <SidebarGroupLabel>{t("sidebar.dataTools")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "url"}
                      onClick={() => setActiveTab("url")}
                      tooltip={t("sidebar.urlCoder")}
                    >
                      <LinkIcon />
                      <span>{t("sidebar.urlCoder")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "uuid"}
                      onClick={() => setActiveTab("uuid")}
                      tooltip={t("sidebar.uuidGenerator")}
                    >
                      <FingerprintIcon />
                      <span>{t("sidebar.uuidGenerator")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "jwt"}
                      onClick={() => setActiveTab("jwt")}
                      tooltip={t("sidebar.jwtParser")}
                    >
                      <KeyRoundIcon />
                      <span>{t("sidebar.jwtParser")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "json"}
                      onClick={() => setActiveTab("json")}
                      tooltip={t("sidebar.jsonFormatter")}
                    >
                      <BracesIcon />
                      <span>{t("sidebar.jsonFormatter")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {/* 图片工具分组 */}
            <SidebarGroup>
              <SidebarGroupLabel>{t("sidebar.imageTools")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "image"}
                      onClick={() => setActiveTab("image")}
                      tooltip={t("sidebar.imageCompressor")}
                    >
                      <ImageDownIcon />
                      <span>{t("sidebar.imageCompressor")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "format"}
                      onClick={() => setActiveTab("format")}
                      tooltip={t("sidebar.imageFormatConverter")}
                    >
                      <ArrowRightLeftIcon />
                      <span>{t("sidebar.imageFormatConverter")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "video"}
                      onClick={() => setActiveTab("video")}
                      tooltip={t("sidebar.videoExtractor")}
                    >
                      <VideoIcon />
                      <span>{t("sidebar.videoExtractor")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          {/* 设置入口 */}
          <SidebarFooter className="border-t p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeTab === "settings"}
                  onClick={() => setActiveTab("settings")}
                  tooltip={t("sidebar.settings")}
                >
                  <SettingsIcon />
                  <span>{t("sidebar.settings")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        {/* 内容区域 */}
        <SidebarInset>
          <main className="flex-1 overflow-auto">
            {activeTab === "url" && <URLCoderPage />}
            {activeTab === "uuid" && <UUIDGeneratorPage />}
            {activeTab === "image" && <ImageCompressorPage />}
            {activeTab === "format" && <ImageFormatConverterPage />}
            {activeTab === "jwt" && <JwtParserPage />}
            {activeTab === "json" && <JsonFormatterPage />}
            {activeTab === "video" && <VideoFrameExtractorPage />}
            {activeTab === "settings" && <SettingsPage />}
          </main>
        </SidebarInset>
      </SidebarProvider>
      {/* 退出确认对话框 */}
      <QuitConfirmDialog
        open={showQuitDialog}
        onOpenChange={setShowQuitDialog}
        onChoice={handleQuitChoice}
      />
      {/* 关于对话框 */}
      {showAboutDialog && (
        <AboutDialog open={showAboutDialog} onOpenChange={setShowAboutDialog} />
      )}
    </TooltipProvider>
  );
}

/**
 * 关于对话框
 *
 * 显示应用名称、图标、版本号和简介。
 * 通过系统托盘菜单的"关于"选项触发。
 */
function AboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <span className="hidden" />
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-80 gap-0 px-7 pt-7 pb-6">
        <AlertDialogHeader className="text-center sm:text-center gap-1 items-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2">
            <BoxIcon className="size-7" />
          </div>
          <AlertDialogTitle className="text-base">
            {t("aboutDialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            {t("aboutDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-5 text-center text-xs text-muted-foreground">
          {t("aboutDialog.version")}：v{__APP_VERSION__}
        </div>

        <div className="mt-5">
          <AlertDialogCancel className="w-full h-9">
            {t("aboutDialog.close")}
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * 应用根组件
 *
 * 包裹 I18nProvider，为整个应用提供国际化上下文。
 */
function AppContent() {
  return (
    <I18nProvider>
      <App />
    </I18nProvider>
  );
}

export default AppContent;
