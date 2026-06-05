/**
 * 图片处理共享工具函数
 *
 * 提供图片相关的通用功能，包括文件大小格式化、
 * 图片加载、拖拽事件处理等，供多个页面组件复用。
 */

// ============================================================
// 文件大小格式化
// ============================================================

/**
 * 将字节数格式化为人类可读的字符串
 *
 * @param bytes - 文件大小（字节）
 * @returns 格式化后的字符串，如 "1.5 MB"、"256.0 KB"、"512 B"
 *
 * @example
 * formatSize(1024)       // "1.0 KB"
 * formatSize(1536000)    // "1.46 MB"
 * formatSize(512)        // "512 B"
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ============================================================
// 图片加载
// ============================================================

/** 图片加载结果 */
export interface ImageLoadResult {
  /** Object URL（需手动释放） */
  url: string;
  /** 图片原始宽度（像素） */
  width: number;
  /** 图片原始高度（像素） */
  height: number;
}

/**
 * 加载图片文件并获取其尺寸信息
 *
 * 通过创建 Image 元素加载文件，返回 Object URL 和图片尺寸。
 * 返回的 Object URL 在不再使用时需调用 URL.revokeObjectURL() 释放。
 *
 * @param file - 要加载的图片文件
 * @returns 图片加载结果，包含 URL 和尺寸
 */
export function loadImageFile(file: File): Promise<ImageLoadResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      // 加载失败时仍然返回（宽度/高度为 0），避免 Promise 永远 pending
      resolve({ url, width: 0, height: 0 });
    };
    img.src = url;
  });
}

// ============================================================
// 拖拽区域 Hook 工具
// ============================================================

/**
 * 拖拽高亮状态管理器
 *
 * 为拖拽上传区域提供统一的视觉反馈管理。
 * 当文件拖入目标区域时添加高亮样式，拖出时移除。
 *
 * @param dropRef - 拖拽目标区域的 DOM ref
 * @returns 拖拽事件处理函数集合
 */
export function createDragHandlers(dropRef: React.RefObject<HTMLElement | null>) {
  /** 拖拽进入/经过时添加高亮样式 */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    dropRef.current?.classList.add("border-primary", "bg-primary/5");
  };

  /** 拖拽离开时移除高亮样式 */
  const handleDragLeave = () => {
    dropRef.current?.classList.remove("border-primary", "bg-primary/5");
  };

  /** 拖拽放下时移除高亮样式 */
  const removeHighlight = () => {
    dropRef.current?.classList.remove("border-primary", "bg-primary/5");
  };

  return { handleDragOver, handleDragLeave, removeHighlight };
}
