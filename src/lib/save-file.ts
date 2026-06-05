/**
 * 文件保存工具
 *
 * 提供统一的文件保存接口，自动适配运行环境：
 * - Tauri 桌面环境：弹出原生保存对话框，直接写入磁盘
 * - 浏览器环境：回退到传统的 <a> 标签下载方式
 *
 * @module lib/save-file
 */

/**
 * 保存文件到用户选择的位置
 *
 * Tauri 环境下会弹出系统原生的文件保存对话框，让用户选择保存路径。
 * 浏览器环境下会触发浏览器的默认下载行为。
 *
 * @param blob - 要保存的文件数据
 * @param fileName - 建议的文件名（含扩展名）
 *
 * @example
 * const blob = new Blob(["Hello"], { type: "text/plain" });
 * await saveFile(blob, "hello.txt");
 */
export async function saveFile(blob: Blob, fileName: string): Promise<void> {
  try {
    // Tauri 环境：动态导入插件，弹出保存对话框
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    // 根据文件扩展名设置过滤器
    const ext = fileName.split(".").pop() || "";
    const filePath = await save({
      defaultPath: fileName,
      filters: [{ name: "Images", extensions: [ext] }],
    });

    if (filePath) {
      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(arrayBuffer));
    }
  } catch {
    // 浏览器回退：使用传统的 <a> 标签下载
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    // 延迟释放 URL，确保下载完成
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
