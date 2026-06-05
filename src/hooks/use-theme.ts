/**
 * 主题偏好 Hook
 *
 * 管理应用的明暗主题切换，支持三种模式：
 * - "system"：跟随系统偏好（默认）
 * - "light"：强制浅色模式
 * - "dark"：强制深色模式
 *
 * 通过在 `<html>` 元素上切换 `.dark` 类名来控制主题，
 * Tailwind CSS 的 `dark:` 变体响应此类名。
 * 偏好持久化到 localStorage，与语言偏好的持久化模式一致。
 *
 * 注意：React 渲染前的初始主题由 `src/main.tsx` 中的
 * `initTheme()` 同步应用，以避免页面闪烁。本 Hook
 * 在 React 挂载后接管主题的响应式管理。
 *
 * @module hooks/use-theme
 */

import { useState, useCallback, useEffect } from "react";

/** 主题偏好类型 */
export type ThemePreference = "system" | "light" | "dark";

/** localStorage 中保存主题偏好的 key */
const STORAGE_KEY = "appbox-theme";

/**
 * 从 localStorage 恢复已保存的主题偏好
 *
 * @returns 保存的主题偏好，无记录时默认 "system"
 */
function getSavedTheme(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "system" || saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // ignore（隐私模式等场景）
  }
  return "system";
}

/**
 * 应用主题到 DOM
 *
 * 根据 preference 在 `<html>` 元素上切换 `.dark` 类名：
 * - "dark" → 添加 .dark
 * - "light" → 移除 .dark
 * - "system" → 根据系统媒体查询决定
 */
function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === "dark") {
    root.classList.add("dark");
  } else if (preference === "light") {
    root.classList.remove("dark");
  } else {
    // system: 跟随系统偏好
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    root.classList.toggle("dark", mq.matches);
  }
}

/**
 * 主题偏好 Hook
 *
 * 管理主题偏好的读取、切换和持久化。
 * 在 "system" 模式下自动监听系统主题变化。
 *
 * @returns theme — 当前主题偏好
 * @returns setTheme — 切换主题偏好（自动持久化）
 *
 * @example
 * const { theme, setTheme } = useTheme();
 * <Select value={theme} onValueChange={setTheme}>
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(getSavedTheme);

  /** 切换主题偏好并持久化到 localStorage */
  const setTheme = useCallback((newTheme: ThemePreference) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // ignore
    }
  }, []);

  // 主题偏好变更时：应用主题到 DOM
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // system 模式下：监听系统主题变化，实时同步
  useEffect(() => {
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle("dark", e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return { theme, setTheme } as const;
}
