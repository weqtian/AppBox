# AppBox 开发规范

简体中文 | **[English](./CONTRIBUTING_EN.md)**

本文档定义了 AppBox 项目的代码风格、提交规范、开发流程等约定，确保团队协作的一致性和代码质量。

---

## 目录

- [技术栈约定](#技术栈约定)
- [项目结构规范](#项目结构规范)
- [代码风格](#代码风格)
- [命名约定](#命名约定)
- [组件开发规范](#组件开发规范)
- [国际化（i18n）规范](#国际化i18n规范)
- [Tauri 交互规范](#tauri-交互规范)
  - [应用更新签名配置](#应用更新签名配置)
- [Git 提交规范](#git-提交规范)
- [分支管理](#分支管理)
- [错误处理规范](#错误处理规范)
- [性能优化指南](#性能优化指南)
- [测试规范](#测试规范)
- [开发日志规范](#开发日志规范)

---

## 技术栈约定

| 技术 | 用途 | 说明 |
|------|------|------|
| React 19 | UI 框架 | 使用函数式组件 + Hooks，禁止 Class 组件 |
| TypeScript 5.8 | 类型系统 | 严格模式已开启（`strict: true`） |
| Vite 7 | 构建工具 | 开发端口固定 1420，HMR 端口 1421 |
| Tauri 2 | 桌面引擎 | Rust 后端，前端通过插件 API 交互 |
| Tailwind CSS 4 | 样式方案 | 使用原子化 CSS，避免自定义 CSS |
| shadcn/ui | UI 组件库 | radix-nova 风格，组件位于 `src/components/ui/` |
| Bun / pnpm / npm | 包管理器 | 推荐使用 Bun，pnpm 和 npm 亦可 |

---

## 项目结构规范

```
src/
├── components/          # 组件目录
│   ├── ui/              # shadcn/ui 基础组件（自动生成，勿手动修改）
│   └── *.tsx            # 业务组件（如 QuitConfirmDialog）
├── hooks/               # 自定义 Hooks
├── i18n/                # 国际化
│   ├── index.tsx        # I18nProvider 与 useTranslation
│   └── locales/         # 语言文件（每种语言一个文件）
├── lib/                 # 工具库（纯函数，无 UI 依赖）
├── pages/               # 页面组件（每个工具一个页面）
├── App.tsx              # 主应用组件（侧边栏 + 路由）
├── App.css              # 全局样式
└── main.tsx             # 入口文件
```

**规则：**

- `lib/` 下的文件必须是纯函数，不能导入 React 或依赖 DOM
- `pages/` 下的文件是页面级组件，每个文件导出一个默认组件
- `components/ui/` 由 shadcn CLI 管理，不要手动修改
- 业务组件放在 `components/` 根目录

---

## 代码风格

### TypeScript

```typescript
// ✅ 使用 interface 定义对象类型
interface UserInfo {
  name: string;
  age: number;
}

// ✅ 使用 type 定义联合类型、工具类型
type Status = "pending" | "loading" | "done" | "error";

// ❌ 避免使用 any
const data: any = {}; // BAD

// ✅ 使用 unknown 并进行类型守卫
const data: unknown = {};
if (typeof data === "object" && data !== null) { /* ... */ }
```

### React

```typescript
// ✅ 函数式组件 + 导出
export default function MyPage() {
  const [value, setValue] = useState("");
  return <div>{value}</div>;
}

// ✅ 使用 useCallback 包裹传递给子组件的回调
const handleClick = useCallback(() => {
  // ...
}, [dependency]);

// ✅ 使用 useMemo 缓存计算结果
const result = useMemo(() => expensiveCalc(data), [data]);

// ❌ 不要在 useEffect 中直接声明异步函数
useEffect(async () => { ... }, []); // BAD

// ✅ 在 useEffect 内部调用异步函数
useEffect(() => {
  const fetchData = async () => { ... };
  fetchData();
}, []);
```

### 样式

```tsx
// ✅ 使用 Tailwind 原子类
<div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">

// ✅ 使用 cn() 合并条件类名
<div className={cn("rounded-lg border", isActive && "border-primary bg-primary/5")}>

// ❌ 不要写自定义 CSS（除非确实无法用 Tailwind 实现）
```

### 注释

```typescript
/**
 * 模块级文档注释
 *
 * 简要描述模块的职责和功能。
 *
 * @module lib/example
 */

/**
 * 函数文档注释
 *
 * 详细描述函数的行为。
 *
 * @param name - 参数描述
 * @returns 返回值描述
 *
 * @example
 * const result = myFunction("hello");
 */
export function myFunction(name: string): string {
  // 行内注释：解释"为什么"而不是"是什么"
  const normalized = name.trim().toLowerCase();
  return normalized;
}
```

---

## 命名约定

| 场景 | 格式 | 示例 |
|------|------|------|
| 文件名 | PascalCase | `URLCoderPage.tsx`、`jwt.ts` |
| 组件名 | PascalCase | `ImageCompressorPage` |
| Hook 文件 | kebab-case | `use-mobile.ts` |
| 工具文件 | kebab-case | `save-file.ts` |
| 常量 | UPPER_SNAKE_CASE | `ACCEPTED_TYPES`、`OUTPUT_FORMATS` |
| 函数/变量 | camelCase | `handleClick`、`isLoading` |
| 类型/接口 | PascalCase | `ImageInfo`、`ConversionItem` |
| i18n key | camelCase（点号分隔） | `sidebar.urlCoder` |
| CSS 类名 | Tailwind 原子类 | `text-sm`、`rounded-lg` |

---

## 组件开发规范

### 页面组件结构

每个页面组件应遵循以下结构：

```typescript
/**
 * 页面名称
 *
 * 页面功能描述。
 *
 * @module pages/PageName
 */

// 1. 导入
import { useState, useCallback } from "react";
// ...

// 2. 类型定义
interface Item {
  id: string;
  name: string;
}

// 3. 常量
const MAX_COUNT = 100;

// 4. 工具函数（组件外）
function helperFunction() { /* ... */ }

// 5. 页面组件
export default function PageName() {
  const { t } = useTranslation();

  // 5a. 状态声明
  const [items, setItems] = useState<Item[]>([]);

  // 5b. 回调函数
  const handleAction = useCallback(() => { /* ... */ }, []);

  // 5c. JSX
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* ... */}
    </div>
  );
}
```

### 新增工具页面的步骤

1. 在 `src/pages/` 下创建新页面组件
2. 在所有 4 个语言文件中添加翻译 key
3. 在 `src/App.tsx` 中添加侧边栏菜单项和条件渲染
4. 在 `README.md` 的功能特性表中添加说明

---

## 国际化（i18n）规范

### 翻译 Key 命名

```
pageName.section.field    // 如 urlCoder.input
pageName.action           // 如 uuid.generate
componentName.state       // 如 quitDialog.title
```

### 添加新翻译的步骤

1. 在 `src/i18n/locales/zh-CN.ts` 中添加新 key（这是源文件）
2. 在 `en.ts`、`ja.ts`、`ar.ts` 中添加相同的 key（类型系统会强制检查）
3. 在组件中通过 `t("key.path")` 使用

### 注意事项

- **禁止**在 `lib/` 文件中使用硬编码的用户可见字符串
- 需要国际化的字符串应通过参数传入，由页面组件调用 `t()` 获取
- 相对时间等动态文本使用 `{n}` 占位符（如 `"{n} 分钟前"`）

---

## Tauri 交互规范

### 插件使用模式

所有 Tauri API 调用必须提供浏览器回退方案：

```typescript
// ✅ 正确：try Tauri，catch 回退到浏览器
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await writeText(text);  // Tauri 插件
  } catch {
    await navigator.clipboard.writeText(text);  // 浏览器回退
  }
}

// ❌ 错误：只使用 Tauri API，浏览器环境无法运行
export async function copyToClipboard(text: string): Promise<void> {
  await writeText(text);
}
```

### Rust 后端

- `lib.rs` 中注册命令和插件
- `main.rs` 仅作为入口，调用 `lib::run()`
- 使用 `#[tauri::command]` 定义可从前端调用的命令
- 避免在 Rust 端 `unwrap()`，使用模式匹配安全处理

### 应用更新签名配置

项目使用 Tauri 的 minisign 签名机制保障自动更新的安全性。CI 构建时需要签名私钥来对更新包签名，客户端通过内嵌的公钥验证签名。

#### 首次配置（新仓库 / 新开发者）

**1. 生成签名密钥对：**

```bash
# 在项目根目录执行，密钥保存到 ~/.tauri/appbox.key
pnpm tauri signer generate -w ~/.tauri/appbox.key
```

执行后会提示输入密码，然后输出：

```
Private key:  dW50cnVzdGVkIGNvbW1lbnQ6IG...（很长的 base64 字符串）
Public key:   dW50cnVzdGVkIGNvbW1lbnQ6IG...（另一个 base64 字符串）
```

- **私钥**：同时保存在终端输出和 `~/.tauri/appbox.key` 文件中
- **公钥**：仅显示在终端输出中
- **密码**：请妥善保管，丢失后无法恢复

> ⚠️ **重新生成密钥会导致旧版本无法验证新更新**。如果密钥对已经存在，请复用现有密钥，不要重新生成。

**2. 配置公钥到项目：**

将公钥字符串填入 `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey` 字段：

```json
{
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6I..."
    }
  }
}
```

**3. 配置 GitHub Secrets：**

进入 GitHub 仓库 → **Settings → Secrets and variables → Actions**，添加以下两个 Secret：

| Secret 名称 | 值 | 说明 |
|---|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | 生成的私钥字符串 | CI 构建时用于签名更新包 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 生成时设置的密码 | 用于解密私钥 |

> 这些 Secret 即使在公开仓库中也是安全的，只有仓库管理员可以设置和查看名称，值不可读取。

#### 相关配置文件

| 文件 | 作用 |
|---|---|
| `src-tauri/tauri.conf.json` → `bundle.createUpdaterArtifacts` | 构建时生成签名更新产物 |
| `src-tauri/tauri.conf.json` → `plugins.updater.pubkey` | 客户端验证签名用的公钥 |
| `.github/workflows/release.yml` → `TAURI_SIGNING_PRIVATE_KEY` | CI 发布时签名 |
| `.github/workflows/build.yml` → `TAURI_SIGNING_PRIVATE_KEY` | CI 构建时签名 |

---

## Git 提交规范

### Commit Message 格式

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式（支持中文）：

```
<type>(<scope>): <subject>

<body>
```

### Type 列表

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(video): 添加视频截取功能` |
| `fix` | Bug 修复 | `fix(jwt): 修复时间戳解析错误` |
| `refactor` | 重构（不改变行为） | `refactor(i18n): 提取共享翻译 key` |
| `docs` | 文档更新 | `docs: 更新 README` |
| `style` | 样式调整（不影响逻辑） | `style(sidebar): 调整间距` |
| `perf` | 性能优化 | `perf(image): 使用 OffscreenCanvas 加速` |
| `test` | 测试相关 | `test(utils): 添加 formatSize 单元测试` |
| `chore` | 构建/工具变更 | `chore: 更新依赖版本` |
| `ci` | CI 配置变更 | `ci: 添加 GitHub Actions 构建流程` |

### Scope 列表

| Scope | 对应模块 |
|-------|----------|
| `core` | 主应用、入口文件 |
| `sidebar` | 侧边栏导航 |
| `url` | URL 编解码页面 |
| `uuid` | UUID 生成器页面 |
| `jwt` | JWT 解析页面 |
| `image` | 图片压缩页面 |
| `format` | 图片格式转换页面 |
| `video` | 视频截取页面 |
| `i18n` | 国际化相关 |
| `tauri` | Tauri/Rust 后端 |
| `ui` | UI 组件 |

---

## 分支管理

```
main        ← 稳定的发布分支
└── dev     ← 开发分支（日常开发合并到此）
    ├── feat/xxx   ← 功能分支
    ├── fix/xxx    ← 修复分支
    └── docs/xxx   ← 文档分支
```

- `main` 分支始终可部署
- 日常开发在 `dev` 分支进行
- 功能开发从 `dev` 创建 `feat/xxx` 分支
- 合并前确保 TypeScript 类型检查通过（`tsc --noEmit`）

---

## 错误处理规范

### 前端错误处理

```typescript
// ✅ 向用户展示错误
try {
  await compress();
} catch (err) {
  setError(err instanceof Error ? err.message : String(err));
}

// ❌ 静默忽略错误
try {
  await compress();
} catch (err) {
  console.error(err);  // 用户看不到任何反馈
}
```

### 错误显示一致性

每个页面应使用统一的错误展示方式：

```tsx
{/* 错误提示条 */}
{error && (
  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
    {error}
  </div>
)}
```

### Rust 错误处理

```rust
// ✅ 使用模式匹配
let icon = match app.default_window_icon() {
    Some(icon) => icon.clone(),
    None => {
        eprintln!("Warning: No default window icon configured");
        return Ok(());
    }
};

// ❌ 不要在库代码中使用 unwrap()
let icon = app.default_window_icon().unwrap().clone();
```

---

## 性能优化指南

### 图片处理

- 优先使用 `createImageBitmap` + `OffscreenCanvas`（不阻塞主线程）
- 使用 `URL.createObjectURL` 而非 Data URL（减少内存占用）
- 不再使用时及时调用 `URL.revokeObjectURL` 释放内存

### React 渲染

- 使用 `useCallback` 包裹传递给子组件的回调函数
- 使用 `useMemo` 缓存计算密集型结果
- 批量操作时使用 `requestAnimationFrame` 让浏览器有机会更新 UI

### 代码复用

- 提取重复逻辑到 `src/lib/` 下的工具文件
- 页面间共享的 Hook 提取到 `src/hooks/`
- 避免在多个页面中复制相同的工具函数

---

## 测试规范

### 类型检查

提交前必须通过 TypeScript 类型检查：

```bash
npx tsc --noEmit
```

### 手动测试清单

新增功能时，检查以下项目：

- [ ] 功能在 Tauri 桌面环境正常工作
- [ ] 功能在纯浏览器环境（`bun run dev`）正常工作
- [ ] 切换到英语/日语/阿拉伯语，界面文本正确显示
- [ ] 阿拉伯语下布局正确（RTL）
- [ ] 窗口缩小时布局不破溃（响应式）
- [ ] 暗色模式下颜色和对比度正常

---

## 开发日志规范

### 为什么需要开发日志？

项目采用 [CHANGELOG.md](./CHANGELOG.md) 作为统一的开发日志，记录所有功能迭代、BUG 修复和架构变更。这能帮助：

- **新成员快速上手**：通过阅读 CHANGELOG 了解项目的演进历程和当前状态
- **团队协作透明**：每位开发者都能了解其他人做了什么、改了什么
- **版本追溯**：快速定位某个功能或问题是在何时引入的

### 什么时候必须更新？

以下场景 **必须** 在开发完成后同步更新 `CHANGELOG.md`：

| 场景 | 示例 |
|------|------|
| 新功能开发 | 新增工具页面、新增系统功能 |
| BUG 修复 | 修复运行时错误、修复控制台警告、修复样式问题 |
| 功能变更 | 修改已有功能的行为或交互 |
| 代码重构 | 调整项目结构、提取公共模块、重命名文件 |
| 架构调整 | 引入新的依赖、修改构建配置、调整技术方案 |
| 文档更新 | 重大文档变更（小的文档 typo 不需要） |
| CI/CD 变更 | 修改构建流程、添加新的工作流 |

### 写什么内容？

每条记录应包含：

```
### <类型图标> <简洁标题>

- **问题/背景**：为什么要做这个变更？（BUG 修复需要描述问题现象）
- **方案/修复**：具体做了什么？
- **影响范围**：涉及哪些文件或模块？
```

### 类型图标对照

| 图标 | 类型 | 对应 commit type |
|------|------|-----------------|
| ✨ | 新功能 | `feat` |
| 🐛 | 修复 | `fix` |
| 🔧 | 重构 | `refactor` |
| 📝 | 文档 | `docs` |
| 🏗️ | 构建/CI | `chore` / `ci` |
| 🎨 | 样式 | `style` |
| ⚡ | 性能 | `perf` |

### 写在哪？

- 新记录追加到文件顶部（最新的日期在最前面）
- 同一天的多个变更归入同一个日期分组
- 每个日期分组内按类型排序：✨ → 🐛 → 🔧 → 其他

### 示例

```markdown
## [2026-06-06] — 图片工具增强 + 系统托盘完善

### ✨ 系统托盘：关于对话框实现

- 创建独立的 AboutDialog 组件，显示应用图标、名称、版本号和简介
- 为所有 4 种语言添加 aboutDialog 翻译

### 🐛 修复 AlertDialog 缺少 Trigger 的控制台警告

- **问题**：AlertDialog 缺少 AlertDialogTrigger 子元素，导致 Radix UI 警告
- **修复**：添加视觉隐藏的 trigger 元素
- **影响范围**：QuitConfirmDialog.tsx、App.tsx
```

### 开发流程 Checklist

每次开发完成前，按以下清单检查：

1. [ ] 代码通过 TypeScript 类型检查（`npx tsc --noEmit`）
2. [ ] 新增功能的 i18n 翻译已添加到所有 4 个语言文件
3. [ ] **已更新 CHANGELOG.md**，记录本次变更内容
4. [ ] Git commit message 遵循 Conventional Commits 规范
