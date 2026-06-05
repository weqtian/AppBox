/**
 * 剪贴板操作工具
 *
 * 提供统一的剪贴板写入接口，自动适配运行环境：
 * - Tauri 桌面环境：使用 clipboard-manager 插件
 * - 浏览器环境：回退到 navigator.clipboard API
 *
 * @module lib/clipboard
 */

import { writeText } from "@tauri-apps/plugin-clipboard-manager";

/**
 * 复制文本到系统剪贴板
 *
 * 优先使用 Tauri clipboard-manager 插件（桌面环境），
 * 失败时回退到浏览器标准 navigator.clipboard API。
 *
 * @param text - 要复制的文本内容
 * @throws 当两种方式都失败时抛出异常
 *
 * @example
 * await copyToClipboard("Hello, World!");
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    // Tauri 环境：使用 clipboard-manager 插件
    await writeText(text);
  } catch {
    // 浏览器回退：使用标准 Clipboard API
    await navigator.clipboard.writeText(text);
  }
}
