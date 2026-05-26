import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

// 暗色模式：根据系统偏好自动切换 .dark 类
function initDarkMode() {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = (isDark: boolean) => {
    document.documentElement.classList.toggle("dark", isDark);
  };

  apply(mq.matches);
  mq.addEventListener("change", (e) => apply(e.matches));
}

initDarkMode();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
