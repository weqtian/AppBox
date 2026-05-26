import { writeText } from "@tauri-apps/plugin-clipboard-manager";

/**
 * 复制文本到剪贴板
 * 优先使用 Tauri clipboard-manager 插件，回退到浏览器 navigator.clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    // Tauri 环境：使用 clipboard-manager 插件
    await writeText(text);
  } catch {
    // 浏览器回退
    await navigator.clipboard.writeText(text);
  }
}