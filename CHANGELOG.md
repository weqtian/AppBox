# CHANGELOG — AppBox 开发日志

> **本文件记录 AppBox 项目的所有迭代、变更与修复。**
>
> ⚠️ **开发者必读**：每次需求开发、BUG 修复、功能变更、重构等操作完成后，**必须**同步更新本文件。详见 [CONTRIBUTING.md](./CONTRIBUTING.md) 中的「开发日志规范」章节。

---

## 格式说明

每条记录遵循以下格式：

```
### [<日期>]

#### <类型图标> <标题>

- **变更描述**
- **影响范围**

> 相关提交：<commit hash>
```

### 类型图标

| 图标 | 类型 | 说明 |
|------|------|------|
| ✨ | 新功能 `feat` | 新增功能或页面 |
| 🐛 | 修复 `fix` | 修复 BUG 或警告 |
| 🔧 | 重构 `refactor` | 代码重构，不改变行为 |
| 📝 | 文档 `docs` | 文档更新 |
| 🏗️ | 构建 `chore/ci` | 构建、CI、依赖变更 |
| 🎨 | 样式 `style` | UI 样式调整 |
| ⚡ | 性能 `perf` | 性能优化 |

---

## [2026-06-06] — 应用自动更新

### ✨ 应用自动更新功能

- 新增应用内自动更新检查与安装功能，用户无需手动下载新版本
- **Rust 后端**：
  - 集成 `tauri-plugin-updater` + `tauri-plugin-process` 插件
  - 实现 `check_for_update` 命令：检查更新并返回版本号、更新说明、发布日期
  - 实现 `perform_update` 命令：下载并安装更新，通过 Tauri 事件推送下载进度
  - 支持 GitHub 镜像加速（`build_endpoint` 动态构建更新端点 URL）
- **前端界面**：
  - 在 `SettingsPage.tsx` 设置中心新增 `UpdateSection` 更新组件
  - 启动时 3 秒后自动静默检查更新（失败不提示）
  - 支持 5 种下载镜像：直连（GitHub）、gh-proxy.org、v4/v6/cdn.gh-proxy.org
  - 实时下载进度条显示（百分比）
  - 下载完成后自动重启应用
  - 镜像选择持久化到 `localStorage`
- **签名与安全**：
  - 更新包使用 minisign 签名（`TAURI_SIGNING_PRIVATE_KEY`）
  - 客户端内嵌公钥验证更新完整性，防止篡改
  - GitHub Actions CI 自动签名发布产物
- 为所有 4 种语言添加 `update.*` 翻译 key
- 添加 `updater:default` + `process:default` 权限声明

> 相关提交：`8c54aee`、`f76f67b`

### 🏗️ CI/CD 签名配置

- GitHub Actions 工作流（`build.yml` / `release.yml`）添加 `TAURI_SIGNING_PRIVATE_KEY` 和 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 环境变量
- `tauri.conf.json` 配置 `createUpdaterArtifacts: true`，构建时自动生成签名更新产物

---

## [2026-06-06] — Base64 编解码 + 时间戳转换

### ✨ 新增 Base64 编解码工具

- 新增 `src/pages/Base64CoderPage.tsx` Base64 编解码工具
- **实时编解码**：输入文本自动显示 Base64 编码和解码结果
- **UTF-8 安全**：完整支持中文、日文等多字节字符（TextEncoder/TextDecoder）
- **智能检测**：自动识别输入是文本还是 Base64 字符串
- **双栏结果**：编码结果和解码结果并排显示
- **一键复制**：分别复制编码/解码结果
- 为所有 4 种语言添加 `sidebar.base64Coder` + `base64.*` 翻译 key

### ✨ 新增时间戳转换工具

- 新增 `src/pages/TimestampPage.tsx` 时间戳转换工具
- **当前时间戳**：顶部实时显示当前 Unix 时间戳（秒/毫秒），每秒自动刷新
- **时间戳 → 日期**：输入时间戳，显示本地时间、UTC 时间、相对时间
- **日期 → 时间戳**：选择日期时间，生成秒级/毫秒级时间戳 + ISO 8601 格式
- **自动识别**：自动区分秒级（10 位）和毫秒级（13 位）时间戳
- **相对时间**：支持国际化显示（刚刚/N 秒前/N 分钟前等）
- 为所有 4 种语言添加 `sidebar.timestamp` + `timestamp.*` 翻译 key

---

## [2026-06-06] — JSON 格式化工具

### ✨ 新增 JSON 格式化/美化工具页面

- 新增 `src/pages/JsonFormatterPage.tsx` JSON 格式化工具
- **实时格式化**：输入 JSON 即时美化输出，无需手动触发
- **语法高亮**：key / string / number / boolean / null 五类着色，清晰区分
- **缩进选择**：支持 2 空格 / 4 空格 / Tab 三种缩进模式
- **压缩模式**：一键切换为单行紧凑 JSON
- **错误定位**：无效 JSON 时显示错误信息与行列号
- **一键复制**：复制格式化后的 JSON 到剪贴板
- **左右分栏布局**：左侧输入、右侧高亮输出，高效直观
- 为所有 4 种语言添加 `sidebar.jsonFormatter` + `json.*` 共 16 个翻译 key

---

## [2026-06-06] — 设置中心 + 系统托盘完善

### ✨ 设置中心页面

- 新增 `src/pages/SettingsPage.tsx` 设置中心页面，采用分组卡片布局
- **外观卡片**：主题切换（跟随系统 / 浅色 / 深色），支持手动控制明暗模式
- **语言卡片**：界面语言选择（从侧边栏 Footer 迁移至此）
- **关于卡片**：应用图标、名称、描述、版本号
- 侧边栏底部语言选择器替换为齿轮图标，点击进入设置页面

### ✨ 主题切换功能

- 新增 `src/hooks/use-theme.ts` 主题持久化 Hook
  - 支持 `"system"` / `"light"` / `"dark"` 三种模式
  - 偏好持久化到 localStorage（key: `appbox-theme`）
  - system 模式下监听系统主题变化实时同步
- 重构 `src/main.tsx` 主题初始化：`initDarkMode()` → `initTheme()`
  - 优先读取 localStorage 中的主题偏好
  - React 渲染前同步应用，避免主题闪烁（FOUC）

### ✨ 系统托盘：关于对话框实现

- 实现系统托盘右键菜单「关于 AppBox」功能
- 创建独立的 AboutDialog 组件，显示应用图标、名称、版本号和简介
- 为所有 4 种语言（zh-CN / en / ja / ar）添加 `aboutDialog` 翻译

### 🐛 修复 AlertDialog 缺少 Trigger 的控制台警告

- **问题**：`QuitConfirmDialog` 和 `AboutDialog` 使用 `AlertDialog` 但缺少 `AlertDialogTrigger` 子元素
- **修复**：添加视觉隐藏的 `<AlertDialogTrigger>` 以满足 Radix UI 要求
- **影响范围**：`src/components/QuitConfirmDialog.tsx`、`src/App.tsx`

### 🐛 修复 `__APP_VERSION__` 类型声明缺失

- **修复**：在 `src/vite-env.d.ts` 中添加 `declare const __APP_VERSION__: string`

### 🐛 修复 AboutDialog 错误复用 QuitConfirmDialog

- **问题**：`AboutDialog` 复用了 `QuitConfirmDialog`，点击「关于」弹出退出确认界面
- **修复**：创建独立的 AboutDialog 组件
- **影响范围**：`src/App.tsx`

---

## [2026-06-06] — 图片工具增强

### ✨ 图片压缩：智能与手动模式

- 新增智能压缩模式（自动推荐最佳参数）与手动压缩模式切换
- 优化压缩界面布局与交互体验
- 完善图片压缩相关的多语言文本（zh-CN / en / ja / ar）

> 相关提交：`437b040`

### ✨ 应用结构重构 + 图片工具页面

- 重构整体应用结构，优化模块划分
- 新增图片工具相关页面

> 相关提交：`df38309`

### ✨ 系统托盘：关于对话框实现

- 实现系统托盘右键菜单「关于 AppBox」功能
- 创建独立的 AboutDialog 组件，显示应用图标、名称、版本号和简介
- 为所有 4 种语言（zh-CN / en / ja / ar）添加 `aboutDialog` 翻译

### 🐛 修复 AlertDialog 缺少 Trigger 的控制台警告

- **问题**：`QuitConfirmDialog` 和 `AboutDialog` 使用 `AlertDialog` 但缺少 `AlertDialogTrigger` 子元素，导致 Radix UI 产生控制台警告
- **修复**：在 `AlertDialog` 内添加视觉隐藏的 `<AlertDialogTrigger>` 以满足 Radix UI 要求，同时保持通过 `open`/`onOpenChange` 程序化控制
- **影响范围**：`src/components/QuitConfirmDialog.tsx`、`src/App.tsx`

### 🐛 修复 `__APP_VERSION__` 类型声明缺失

- **问题**：Vite 全局变量 `__APP_VERSION__` 缺少 TypeScript 类型声明，导致编译错误
- **修复**：在 `src/vite-env.d.ts` 中添加 `declare const __APP_VERSION__: string`
- **影响范围**：`src/vite-env.d.ts`

### 🐛 修复 AboutDialog 错误复用 QuitConfirmDialog

- **问题**：`AboutDialog` 组件复用了 `QuitConfirmDialog`，导致点击「关于」时弹出退出确认界面而非应用信息
- **修复**：创建独立的 AboutDialog 组件，使用 AlertDialog 展示应用图标（BoxIcon）、名称、描述和版本号
- **影响范围**：`src/App.tsx`

---

## [2026-06-02] — 视频截帧功能

### ✨ 视频截取功能模块

- 新增视频截帧页面 `VideoFrameExtractorPage`
- 支持加载 MP4、MOV、AVI、MKV、WebM 格式视频
- 逐帧定位（上一帧/下一帧）+ 精确时间输入
- 截取当前帧为 JPEG/PNG 图片并保存
- 添加 `src/lib/video.ts` 视频处理工具库
- 添加所有语言的 `videoExtractor` 翻译

> 相关提交：`50a2474`

---

## [2026-05-27] — 退出确认 + JWT 解析 + 系统托盘

### ✨ 退出确认对话框及系统托盘支持

- 新增 `QuitConfirmDialog` 组件，提供最小化到托盘 / 退出 / 取消三个选项
- 实现 Rust 后端系统托盘（`TrayIconBuilder`）
  - 右键菜单：显示窗口、关于 AppBox、退出
  - 左键点击托盘图标：恢复并聚焦窗口
- 拦截窗口关闭事件，发送到前端弹出确认对话框
- 实现 `execute_quit_choice` 和 `update_tray_menu` 两个 Tauri 命令
- 托盘菜单文本支持国际化，语言切换时同步更新

> 相关提交：`56ffcff`

### 🔧 移除状态栏及相关复制反馈逻辑

- 移除全局状态栏组件
- 移除相关的复制反馈逻辑，简化应用结构

> 相关提交：`0daa4f8`

### ✨ JWT 解析功能

- 新增 JWT 解析页面 `JwtParserPage`
- 实时解析 JWT Token，自动剥离 `Bearer` 等常见前缀
- 颜色高亮显示 Header / Payload / Signature 三部分
- 时间戳字段（exp、iat、nbf、auth_time）格式化为可读时间
- 相对时间支持国际化显示
- 添加 `src/lib/jwt.ts` JWT 解码工具库
- 默认窗口尺寸更新为 1280×832

> 相关提交：`aafa786`、`097a7f2`、`fb8cb4a`

### 🏗️ 分支合并

- 合并 `dev` 分支到 `main`（PR #1）

> 相关提交：`c6d9d8a`

---

## [2026-05-26] — 项目初始化 + 基础功能

### ✨ 项目初始化：主界面与基础工具页面

- 初始化 Tauri 2 + React 19 + TypeScript + Vite 项目
- 实现主界面布局（侧边栏导航 + 内容区域）
- 新增 URL 编解码页面 `URLCoderPage`
  - 支持 URL 编码/解码
  - 支持多层嵌套解码
- 新增 UUID 生成器页面 `UUIDGeneratorPage`
  - 支持 UUID v1/v4
  - 批量生成、一键复制
  - 格式选项：连字符、大小写
- 集成 shadcn/ui（radix-nova 风格）+ Tailwind CSS 4
- 实现国际化框架（I18nProvider + useTranslation Hook）

> 相关提交：`7210dcf`

### ✨ 全面本地化

- 为所有页面添加完整的多语言文本
- 支持中文（zh-CN）、英语（en）、日语（ja）、阿拉伯语（ar）
- 翻译 key 采用嵌套点号路径格式

> 相关提交：`a557a8a`

### ✨ RTL 布局支持

- 阿拉伯语自动切换 RTL 布局
- 侧边栏根据文字方向自动切换左右位置
- 调整侧边栏样式适配 RTL 场景

> 相关提交：`6475b89`

### 📝 项目文档

- 编写完整的 README.md（功能说明、技术栈、项目结构、架构概览）
- 编写 CONTRIBUTING.md 开发规范文档
- 添加英文版 README_EN.md

> 相关提交：`f640444`、`a755a3c`、`07b62fe`

### 🏗️ CI/CD 工作流

- 添加 GitHub Actions 多平台构建与发布工作流
- 支持 macOS、Windows、Linux 三平台
- 迭代优化构建触发条件、缓存策略、权限配置

> 相关提交：`b9ef2b2` 及后续多个 ci/chore 提交

---

## 待开发

以下为计划中的功能（按优先级排列）：

- [ ] 更多图片处理工具（裁剪、旋转、水印等）
- [ ] 正则表达式测试工具
- [ ] 颜色选择器 / 格式转换
