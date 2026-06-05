/**
 * 通用工具函数
 *
 * 提供样式类名合并等通用功能，供 shadcn/ui 组件和页面使用。
 *
 * @module lib/utils
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 Tailwind CSS 类名
 *
 * 结合 clsx（条件类名）和 twMerge（去重 Tailwind 冲突类名），
 * 是 shadcn/ui 的标准工具函数。
 *
 * @param inputs - 类名列表（支持字符串、对象、数组等形式）
 * @returns 合并后的类名字符串
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-primary", { "text-muted": disabled })
 * // => "px-4 py-2 bg-primary"  或  "px-4 py-2 text-muted"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
