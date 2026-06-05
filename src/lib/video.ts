/**
 * 视频处理工具库
 *
 * 提供视频截帧相关的类型定义、格式转换、时间格式化等工具函数。
 * 供 VideoFrameExtractorPage 使用。
 *
 * @module lib/video
 */

import { convertFileSrc } from "@tauri-apps/api/core";

// ============================================================
// 类型定义
// ============================================================

/** 视频文件元数据 */
export interface VideoMetadata {
  /** 视频原始文件路径 */
  filePath: string;
  /** 文件名（不包含目录） */
  fileName: string;
  /** 总时长（秒） */
  duration: number;
  /** 视频宽度（像素） */
  width: number;
  /** 视频高度（像素） */
  height: number;
  /** 输出图片格式 */
  format: "jpeg" | "png";
}

/** 截帧结果 */
export interface FrameResult {
  /** 截取到的图片 Blob URL（由 URL.createObjectURL 创建，需手动释放） */
  url: string;
  /** 截取的图片宽度 */
  width: number;
  /** 截取的图片高度 */
  height: number;
  /** 输出格式 */
  format: "jpeg" | "png";
  /** Blob 原始数据（用于保存文件） */
  blob: Blob;
}

// ============================================================
// 常量
// ============================================================

/** 支持的视频文件扩展名（用于文件选择器过滤） */
export const VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "webm", "m4v"];

/** 支持的输出图片格式 */
export const OUTPUT_FORMATS = [
  { value: "jpeg" as const, label: "JPEG", mime: "image/jpeg", ext: "jpg" },
  { value: "png" as const, label: "PNG", mime: "image/png", ext: "png" },
];

/** 默认帧步长（约 30fps 时一帧的时长，约 33ms） */
export const DEFAULT_FRAME_STEP = 1 / 30;

// ============================================================
// 工具函数
// ============================================================

/**
 * 将本地视频文件路径转换为 webview 可加载的 URL
 *
 * 通过 Tauri 的 asset protocol 加载本地文件，无需将整个文件读入内存。
 *
 * @param filePath - 本地文件绝对路径
 * @returns 可在 webview 中使用的 URL
 */
export function toVideoSrc(filePath: string): string {
  return convertFileSrc(filePath);
}

/**
 * 从完整路径中提取文件名
 *
 * 兼容 Windows（反斜杠）和 Unix（正斜杠）路径分隔符。
 *
 * @param filePath - 完整文件路径
 * @returns 文件名部分
 */
export function getFileName(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
}

/**
 * 从文件名中提取扩展名
 *
 * @param fileName - 文件名
 * @returns 小写扩展名（不含点），无扩展名时返回空字符串
 */
export function getExtension(fileName: string): string {
  const dotIdx = fileName.lastIndexOf(".");
  if (dotIdx < 0) return "";
  return fileName.slice(dotIdx + 1).toLowerCase();
}

/**
 * 将秒数格式化为 mm:ss.cs 时间码
 *
 * cs = 厘秒（centisecond），两位小数。
 * 用于视频时间轴的精确显示。
 *
 * @param seconds - 秒数
 * @returns 格式化后的时间码，如 "01:23.45"
 *
 * @example
 * formatTime(83.4567)  // "01:23.45"
 * formatTime(0)        // "00:00.00"
 * formatTime(-1)       // "00:00.00"（负数视为 0）
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
