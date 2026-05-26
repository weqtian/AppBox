# AppBox

简体中文 | **[English](./README_EN.md)**

基于 **Tauri 2 + React 19 + TypeScript + Vite 7** 的跨平台桌面工具箱应用，提供 URL 编解码、UUID 生成、图片压缩、图片格式转换等常用开发工具。

## 功能特性

| 工具 | 说明 |
|------|------|
| URL 编解码 | URL 编码/解码，支持多层嵌套解码 |
| UUID 生成器 | 批量生成 UUID v1/v4，支持一键复制 |
| 图片压缩 | 调整质量与输出格式压缩图片，实时预览压缩效果 |
| 图片格式转换 | 批量转换图片格式（JPEG/PNG/WebP/AVIF/BMP），支持拖拽上传与批量下载 |

### 通用特性

- **国际化（i18n）**：支持中文、英语、日语、阿拉伯语，阿拉伯语自动 RTL 布局
- **剪贴板集成**：通过 Tauri 插件直接读写系统剪贴板
- **文件保存**：通过 Tauri 原生对话框选择保存路径
- **拖拽上传**：图片工具支持拖拽文件上传
- **响应式布局**：适配不同窗口尺寸

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 19.1 |
| 类型系统 | TypeScript | 5.8 |
| 构建工具 | Vite | 7.0 |
| 桌面引擎 | Tauri | 2.x |
| 包管理器 | Bun | - |
| UI 组件库 | shadcn/ui (radix-nova) | 4.8 |
| CSS 方案 | Tailwind CSS | 4.3 |
| 图标库 | Lucide React | 1.16 |
| Rust 后端 | Tauri + serde | 2021 edition |

## 项目结构

```
AppBox/
├── public/                  # 静态资源（SVG图标等）
├── src/                     # 前端源码
│   ├── assets/              # React组件引用的资源
│   ├── components/          # 组件目录
│   │   ├── ui/              # shadcn/ui 基础组件（15个）
│   │   └── StatusBar.tsx    # 底部状态栏组件
│   ├── hooks/               # 自定义 Hooks
│   │   └── use-mobile.ts    # 移动端检测
│   ├── i18n/                # 国际化
│   │   ├── index.tsx        # I18nProvider 与 useTranslation
│   │   └── locales/         # 语言文件（zh-CN/en/ja/ar）
│   ├── lib/                 # 工具库
│   │   ├── clipboard.ts     # 剪贴板操作（Tauri优先+浏览器回退）
│   │   ├── save-file.ts     # 文件保存（Tauri对话框+浏览器下载回退）
│   │   └── utils.ts         # 通用工具函数
│   ├── pages/               # 页面组件
│   │   ├── URLCoderPage.tsx          # URL 编解码
│   │   ├── UUIDGeneratorPage.tsx     # UUID 生成器
│   │   ├── ImageCompressorPage.tsx   # 图片压缩
│   │   └── ImageFormatConverterPage.tsx # 图片格式转换
│   ├── App.tsx              # 主应用组件（侧边栏导航+页面路由）
│   ├── App.css              # 全局样式与 Tailwind 配置
│   ├── main.tsx             # React 入口文件
│   └── vite-env.d.ts        # Vite 类型声明
├── src-tauri/               # Tauri/Rust 后端
│   ├── capabilities/        # Tauri 权限配置
│   │   └── default.json     # 默认窗口权限声明
│   ├── icons/               # 应用图标（各尺寸）
│   ├── src/
│   │   ├── lib.rs           # Tauri 插件注册与应用构建
│   │   └── main.rs          # Rust 入口
│   ├── Cargo.toml           # Rust 依赖配置
│   ├── build.rs             # Tauri 构建脚本
│   └── tauri.conf.json      # Tauri 应用配置
├── index.html               # HTML 入口模板
├── vite.config.ts           # Vite 构建配置
├── tsconfig.json            # TypeScript 配置
├── tsconfig.node.json       # TypeScript Node 配置（Vite专用）
├── components.json          # shadcn/ui 组件配置
├── package.json             # 前端依赖与脚本
└── bun.lock                 # Bun 锁文件
```

## 前置要求

在开始开发之前，请确保安装以下工具：

- [Bun](https://bun.sh/) — 包管理器与运行时
- [Rust](https://www.rust-lang.org/tools/install) — Tauri 后端编译依赖
- [Tauri Prerequisites](https://tauri.app/start/prerequisites/) — 平台特定依赖

## 快速开始

### 安装依赖

```bash
bun install
```

### 开发模式

启动前端开发服务器：

```bash
bun run dev
```

启动 Tauri 桌面应用（含前端热更新）：

```bash
bun run tauri dev
```

### 生产构建

```bash
bun run tauri build
```

该命令会先执行 TypeScript 类型检查与 Vite 前端打包，然后编译 Rust 后端并生成安装包。

## npm scripts 说明

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动 Vite 开发服务器（端口 1420） |
| `bun run build` | TypeScript 类型检查 + Vite 前端打包 |
| `bun run preview` | 预览打包后的前端产物 |
| `bun run tauri` | Tauri CLI 命令代理（如 `tauri dev`、`tauri build`） |

## 架构概览

### 前端（React + TypeScript）

- 入口文件 `src/main.tsx` 使用 `ReactDOM.createRoot` 渲染应用
- 组件使用 React 19 的函数式组件 + Hooks 模式
- 侧边栏导航切换页面（`Sidebar` + 条件渲染），底部状态栏显示操作反馈
- UI 组件基于 shadcn/ui（radix-nova 风格），通过 Tailwind CSS 4 样式化
- 国际化通过自研 `I18nProvider` + `useTranslation` Hook 实现，支持嵌套 key 翻译
- 图片处理基于 Canvas API，优先使用 `createImageBitmap` + `OffscreenCanvas` 高性能方案

### 后端（Rust + Tauri）

- `src-tauri/src/lib.rs` 注册 Tauri 插件并构建应用
- `src-tauri/src/main.rs` 为 Rust 入口，调用 `appbox_lib::run()`
- 已集成插件：
  - `tauri-plugin-opener` — 打开链接/文件
  - `tauri-plugin-clipboard-manager` — 剪贴板读写
  - `tauri-plugin-dialog` — 原生文件对话框
  - `tauri-plugin-fs` — 文件系统写入
- Rust 依赖：`tauri`、`serde`、`serde_json`

### 前后端交互

前端通过 Tauri 插件 API 与系统交互：

```typescript
// 剪贴板写入
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
await writeText(text);

// 文件保存对话框
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
const filePath = await save({ defaultPath: fileName });
if (filePath) await writeFile(filePath, data);
```

所有系统交互均提供浏览器回退方案，确保纯浏览器环境下也能运行。

### 国际化（i18n）

- 自研轻量方案，基于 React Context + `useTranslation` Hook
- 支持 4 种语言：中文（zh-CN）、英语（en）、日语（ja）、阿拉伯语（ar）
- 阿拉伯语自动切换 RTL 布局（`document.documentElement.dir`）
- 语言偏好持久化到 `localStorage`
- 翻译 key 支持嵌套点号路径（如 `urlCoder.input`）

### 权限与安全

- `src-tauri/capabilities/default.json` 定义了主窗口的权限
- 当前权限：
  - `core:default` — Tauri 核心默认权限
  - `opener:default` — 打开链接默认权限
  - `clipboard-manager:allow-write-text` / `allow-read-text` — 剪贴板读写
  - `dialog:allow-save` / `allow-open` — 文件对话框
  - `fs:allow-write-file` / `allow-write` — 文件写入
- CSP 安全策略：当前为 `null`（开发阶段，生产构建时建议配置）

## 关键配置

### Vite 开发服务器

- 固定端口 `1420`（`strictPort: true`）
- HMR WebSocket 端口 `1421`
- 环境变量 `TAURI_DEV_HOST` 控制 host 与 HMR 地址
- 自动忽略 `src-tauri/**` 目录监听
- `clearScreen: false` 防止遮蔽 Rust 编译错误
- 路径别名 `@` → `./src`
- 集成 `@tailwindcss/vite` 插件

### Tauri 应用配置

- 应用标识：`io.qingtian.appbox`
- 默认窗口：800×600，标题 `AppBox`
- 打包目标：全平台（`targets: "all"`）
- 前端产物目录：`../dist`

### TypeScript 配置

- 目标：ES2020
- 模块解析：bundler 模式
- JSX：`react-jsx`
- 严格模式已开启
- 路径别名：`@/*` → `./src/*`

### shadcn/ui 配置

- 风格：`radix-nova`
- 基础色：`neutral`
- CSS 变量模式已启用
- 图标库：Lucide
- 组件目录：`@/components/ui`

## 推荐 IDE 设置

- [VS Code](https://code.visualstudio.com/) + 以下插件：
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) — Tauri 项目支持
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) — Rust 语言支持
  - [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) — Tailwind 智能提示

## 学习资源

- [Tauri 官方文档](https://tauri.app/)
- [React 官方文档](https://react.dev/)
- [Vite 官方文档](https://vite.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
