/**
 * React 应用入口文件
 *
 * 职责：
 * 1. 初始化暗色模式（监听系统主题偏好）
 * 2. 挂载 React 应用到 DOM
 *
 * @module main
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

/**
 * 初始化暗色模式
 *
 * 监听系统 `prefers-color-scheme` 媒体查询，
 * 自动在 `<html>` 元素上切换 `.dark` 类名。
 * Tailwind CSS 通过 `dark:` 变体响应此类名。
 */
function initDarkMode() {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = (isDark: boolean) => {
    document.documentElement.classList.toggle("dark", isDark);
  };

  // 立即应用当前系统偏好
  apply(mq.matches);
  // 监听系统主题变化
  mq.addEventListener("change", (e) => apply(e.matches));
}

// 在 React 渲染前初始化暗色模式，避免闪烁
initDarkMode();

// 创建 React 根节点并渲染应用
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
