/**
 * 保存文件到用户选择的位置
 * 优先使用 Tauri 对话框让用户选择保存路径，回退到浏览器默认下载
 */
export async function saveFile(blob: Blob, fileName: string): Promise<void> {
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
