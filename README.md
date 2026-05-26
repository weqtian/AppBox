# AppBox

基于 **Tauri 2 + React 19 + TypeScript + Vite 7** 的跨平台桌面应用项目。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 19.1 |
| 类型系统 | TypeScript | 5.8 |
| 构建工具 | Vite | 7.0 |
| 桌面引擎 | Tauri | 2.x |
| 包管理器 | Bun | - |
| UI 组件库 | shadcn/ui | 4.8 |
| Rust 后端 | Tauri + serde | 2021 edition |

## 项目结构

```
AppBox/
├── public/                  # 静态资源（SVG图标等）
├── src/                     # 前端源码
│   ├── assets/              # React组件引用的资源
│   ├── App.tsx              # 主应用组件
│   ├── App.css              # 主应用样式
│   ├── main.tsx             # React入口文件
│   └── vite-env.d.ts        # Vite类型声明
├── src-tauri/               # Tauri/Rust后端
│   ├── capabilities/        # Tauri权限配置
│   │   └── default.json     # 默认窗口权限声明
│   ├── icons/               # 应用图标（各尺寸）
│   ├── src/
│   │   ├── lib.rs           # Tauri命令定义与应用构建
│   │   └── main.rs          # Rust入口
│   ├── Cargo.toml           # Rust依赖配置
│   ├── build.rs             # Tauri构建脚本
│   └── tauri.conf.json      # Tauri应用配置
├── index.html               # HTML入口模板
├── vite.config.ts           # Vite构建配置
├── tsconfig.json            # TypeScript配置
├── tsconfig.node.json       # TypeScript Node配置（Vite专用）
├── package.json             # 前端依赖与脚本
└── bun.lock                 # Bun锁文件
```

## 前置要求

在开始开发之前，请确保安装以下工具：

- [Node.js](https://nodejs.org/)（建议 LTS 版本）
- [Bun](https://bun.sh/) — 包管理器与运行时
- [Rust](https://www.rust-lang.org/tools/install) — Tauri后端编译依赖
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
- 通过 `@tauri-apps/api` 的 `invoke` 方法调用 Rust 后端命令
- 当前示例包含 `greet` 命令调用演示

### 后端（Rust + Tauri）

- `src-tauri/src/lib.rs` 定义 Tauri 命令（如 `greet`）
- `src-tauri/src/main.rs` 为 Rust 入口，调用 `appbox_lib::run()`
- 已集成 `tauri-plugin-opener` 插件
- Rust 依赖：`tauri`、`serde`、`serde_json`

### 前后端通信

前端通过 `invoke()` 调用后端 Tauri 命令：

```typescript
// 前端调用
const result = await invoke("greet", { name: "World" });
```

```rust
// 后端定义
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
```

### 权限与安全

- `src-tauri/capabilities/default.json` 定义了主窗口的权限
- 当前权限：`core:default` + `opener:default`
- CSP 安全策略：当前为 `null`（开发阶段，生产构建时建议配置）

## 关键配置

### Vite 开发服务器

- 固定端口 `1420`（`strictPort: true`）
- HMR WebSocket 端口 `1421`
- 环境变量 `TAURI_DEV_HOST` 控制 host 与 HMR 地址
- 自动忽略 `src-tauri/**` 目录监听
- `clearScreen: false` 防止遮蔽 Rust 编译错误

### Tauri 应用配置

- 应用标识：`io.qingtian.appbox`
- 默认窗口：800×600，标题 `appbox`
- 打包目标：全平台（`targets: "all"`）
- 前端产物目录：`../dist`

### TypeScript 配置

- 目标：ES2020
- 模块解析：bundler 模式
- JSX：`react-jsx`
- 严格模式已开启

## 推荐 IDE 设置

- [VS Code](https://code.visualstudio.com/) + 以下插件：
  - [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) — 如需Vue支持
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) — Tauri项目支持
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) — Rust语言支持

## 学习资源

- [Tauri 官方文档](https://tauri.app/)
- [React 官方文档](https://react.dev/)
- [Vite 官方文档](https://vite.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
