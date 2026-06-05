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

## [2026-06-06] — 图片工具增强 + 系统托盘完善

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

- [ ] 深色/浅色主题手动切换（当前仅跟随系统）
- [ ] 更多图片处理工具（裁剪、旋转、水印等）
- [ ] JSON 格式化/美化工具
- [ ] Base64 编解码工具
- [ ] 正则表达式测试工具
- [ ] 时间戳转换工具
- [ ] 颜色选择器 / 格式转换
- [ ] 应用自动更新机制
