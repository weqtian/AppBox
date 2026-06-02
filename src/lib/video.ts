import { convertFileSrc } from "@tauri-apps/api/core";

/** 视频文件元数据 */
export interface VideoMetadata {
  /** 视频原始文件路径 */
  filePath: string;
  /** 文件名(不包含目录) */
  fileName: string;
  /** 总时长(秒) */
  duration: number;
  /** 视频宽度(像素) */
  width: number;
  /** 视频高度(像素) */
  height: number;
  /** 输出图片格式 */
  format: "jpeg" | "png";
}

/** 截帧结果 */
export interface FrameResult {
  /** 截取到的图片 Blob URL(由 URL.createObjectURL 创建) */
  url: string;
  /** 截取的图片宽度 */
  width: number;
  /** 截取的图片高度 */
  height: number;
  /** 输出格式 */
  format: "jpeg" | "png";
  /** Blob 原始数据(用于保存) */
  blob: Blob;
}

/** 支持的视频文件扩展名(用于文件选择器过滤) */
export const VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "webm", "m4v"];

/** 支持的输出图片格式 */
export const OUTPUT_FORMATS = [
  { value: "jpeg" as const, label: "JPEG", mime: "image/jpeg", ext: "jpg" },
  { value: "png" as const, label: "PNG", mime: "image/png", ext: "png" },
];

/**
 * 将本地视频文件路径转换为 webview 可加载的 URL
 * 通过 tauri asset protocol 加载,无需把整个文件读入内存
 */
export function toVideoSrc(filePath: string): string {
  return convertFileSrc(filePath);
}

/** 从完整路径中提取文件名 */
export function getFileName(filePath: string): string {
  // 兼容 Windows / macOS / Linux 路径分隔符
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
}

/** 从文件名中提取扩展名(小写,无点) */
export function getExtension(fileName: string): string {
  const dotIdx = fileName.lastIndexOf(".");
  if (dotIdx < 0) return "";
  return fileName.slice(dotIdx + 1).toLowerCase();
}

/**
 * 将秒数格式化为 mm:ss.cs(cs = 厘秒,两位)
 * 例: 83.4567 -> "01:23.45"
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00.00";
  const totalCs = Math.floor(seconds * 100);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

/** 默认帧步长(约 30fps 时一帧的时长) */
export const DEFAULT_FRAME_STEP = 1 / 30;
