/**
 * React 应用入口文件
 *
 * 职责：
 * 1. 初始化主题（优先读取 localStorage 偏好，避免闪烁）
 * 2. 挂载 React 应用到 DOM
 *
 * 主题的响应式管理（如系统偏好变化监听）由
 * `src/hooks/use-theme.ts` 中的 `useTheme` Hook 接管。
 * 此处仅做同步初始化，确保 React 渲染前主题已正确应用。
 *
 * @module main
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

/**
 * 初始化主题
 *
 * 在 React 渲染前同步执行，读取 localStorage 中的主题偏好并立即应用。
 * 避免页面加载时出现主题闪烁（FOUC）。
 *
 * - "dark" → 强制深色
 * - "light" → 强制浅色
 * - "system" 或无值 → 跟随系统偏好
 */
function initTheme() {
  try {
    const saved = localStorage.getItem("appbox-theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    } else if (saved === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      // "system" 或无值：跟随系统偏好
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      document.documentElement.classList.toggle("dark", mq.matches);
    }
  } catch {
    // localStorage 不可用时，回退到系统偏好
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    document.documentElement.classList.toggle("dark", mq.matches);
  }
}

// 在 React 渲染前初始化主题，避免闪烁
initTheme();

// 创建 React 根节点并渲染应用
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
