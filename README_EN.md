# AppBox

A cross-platform desktop toolbox built with **Tauri 2 + React 19 + TypeScript + Vite 7**, providing common developer tools such as URL encoding/decoding, UUID generation, image compression, and image format conversion.

**[简体中文](./README.md)** | English

## Features

| Tool | Description |
|------|-------------|
| URL Encoder/Decoder | URL encoding/decoding with support for nested multi-layer decoding |
| UUID Generator | Batch generate UUID v1/v4 with one-click copy |
| Image Compressor | Compress images with adjustable quality and output format, real-time preview |
| Image Format Converter | Batch convert image formats (JPEG/PNG/WebP/AVIF/BMP) with drag-and-drop upload and batch download |

### General Features

- **Internationalization (i18n)**: Supports Chinese, English, Japanese, and Arabic with automatic RTL layout for Arabic
- **Clipboard Integration**: Read/write system clipboard via Tauri plugins
- **File Saving**: Choose save location via native Tauri file dialog
- **Drag & Drop Upload**: Image tools support drag-and-drop file upload
- **Responsive Layout**: Adapts to different window sizes

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React | 19.1 |
| Type System | TypeScript | 5.8 |
| Build Tool | Vite | 7.0 |
| Desktop Engine | Tauri | 2.x |
| Package Manager | Bun | - |
| UI Components | shadcn/ui (radix-nova) | 4.8 |
| CSS Solution | Tailwind CSS | 4.3 |
| Icon Library | Lucide React | 1.16 |
| Rust Backend | Tauri + serde | 2021 edition |

## Project Structure

```
AppBox/
├── public/                  # Static assets (SVG icons, etc.)
├── src/                     # Frontend source code
│   ├── assets/              # Resources referenced by React components
│   ├── components/          # Components directory
│   │   ├── ui/              # shadcn/ui base components (15)
│   │   └── StatusBar.tsx    # Bottom status bar component
│   ├── hooks/               # Custom Hooks
│   │   └── use-mobile.ts    # Mobile detection
│   ├── i18n/                # Internationalization
│   │   ├── index.tsx        # I18nProvider and useTranslation
│   │   └── locales/         # Language files (zh-CN/en/ja/ar)
│   ├── lib/                 # Utility library
│   │   ├── clipboard.ts     # Clipboard operations (Tauri first + browser fallback)
│   │   ├── save-file.ts     # File saving (Tauri dialog + browser download fallback)
│   │   └── utils.ts         # General utility functions
│   ├── pages/               # Page components
│   │   ├── URLCoderPage.tsx          # URL encoder/decoder
│   │   ├── UUIDGeneratorPage.tsx     # UUID generator
│   │   ├── ImageCompressorPage.tsx   # Image compressor
│   │   └── ImageFormatConverterPage.tsx # Image format converter
│   ├── App.tsx              # Main app component (sidebar navigation + page routing)
│   ├── App.css              # Global styles and Tailwind config
│   ├── main.tsx             # React entry file
│   └── vite-env.d.ts        # Vite type declarations
├── src-tauri/               # Tauri/Rust backend
│   ├── capabilities/        # Tauri permission config
│   │   └── default.json     # Default window permission declarations
│   ├── icons/               # App icons (various sizes)
│   ├── src/
│   │   ├── lib.rs           # Tauri plugin registration and app builder
│   │   └── main.rs          # Rust entry point
│   ├── Cargo.toml           # Rust dependency config
│   ├── build.rs             # Tauri build script
│   └── tauri.conf.json      # Tauri app config
├── index.html               # HTML entry template
├── vite.config.ts           # Vite build config
├── tsconfig.json            # TypeScript config
├── tsconfig.node.json       # TypeScript Node config (Vite-specific)
├── components.json          # shadcn/ui component config
├── package.json             # Frontend dependencies and scripts
└── bun.lock                 # Bun lock file
```

## Prerequisites

Before you start developing, make sure you have the following tools installed:

- [Bun](https://bun.sh/) — Package manager and runtime
- [Rust](https://www.rust-lang.org/tools/install) — Tauri backend compilation dependency
- [Tauri Prerequisites](https://tauri.app/start/prerequisites/) — Platform-specific dependencies

## Getting Started

### Install Dependencies

```bash
bun install
```

### Development Mode

Start the frontend dev server:

```bash
bun run dev
```

Start the Tauri desktop app (with frontend hot reload):

```bash
bun run tauri dev
```

### Production Build

```bash
bun run tauri build
```

This command runs TypeScript type checking and Vite frontend bundling first, then compiles the Rust backend and generates the installer.

## npm Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server (port 1420) |
| `bun run build` | TypeScript type check + Vite frontend bundle |
| `bun run preview` | Preview bundled frontend output |
| `bun run tauri` | Tauri CLI proxy (e.g. `tauri dev`, `tauri build`) |

## Architecture Overview

### Frontend (React + TypeScript)

- Entry file `src/main.tsx` renders the app using `ReactDOM.createRoot`
- Components use React 19 functional components + Hooks pattern
- Sidebar navigation switches pages (`Sidebar` + conditional rendering), bottom status bar shows operation feedback
- UI components based on shadcn/ui (radix-nova style), styled with Tailwind CSS 4
- Internationalization via custom `I18nProvider` + `useTranslation` Hook with nested key translation support
- Image processing based on Canvas API, prioritizing `createImageBitmap` + `OffscreenCanvas` for high performance

### Backend (Rust + Tauri)

- `src-tauri/src/lib.rs` registers Tauri plugins and builds the app
- `src-tauri/src/main.rs` is the Rust entry point, calls `appbox_lib::run()`
- Integrated plugins:
  - `tauri-plugin-opener` — Open links/files
  - `tauri-plugin-clipboard-manager` — Clipboard read/write
  - `tauri-plugin-dialog` — Native file dialogs
  - `tauri-plugin-fs` — File system write
- Rust dependencies: `tauri`, `serde`, `serde_json`

### Frontend-Backend Interaction

The frontend interacts with the system via Tauri plugin APIs:

```typescript
// Clipboard write
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
await writeText(text);

// File save dialog
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
const filePath = await save({ defaultPath: fileName });
if (filePath) await writeFile(filePath, data);
```

All system interactions provide browser fallbacks to ensure the app works in a pure browser environment as well.

### Internationalization (i18n)

- Custom lightweight solution based on React Context + `useTranslation` Hook
- Supports 4 languages: Chinese (zh-CN), English (en), Japanese (ja), Arabic (ar)
- Arabic automatically switches to RTL layout (`document.documentElement.dir`)
- Language preference persisted to `localStorage`
- Translation keys support nested dot notation (e.g. `urlCoder.input`)

### Permissions & Security

- `src-tauri/capabilities/default.json` defines the main window permissions
- Current permissions:
  - `core:default` — Tauri core default permissions
  - `opener:default` — Default open link permissions
  - `clipboard-manager:allow-write-text` / `allow-read-text` — Clipboard read/write
  - `dialog:allow-save` / `allow-open` — File dialogs
  - `fs:allow-write-file` / `allow-write` — File writing
- CSP security policy: currently `null` (development stage; recommended to configure for production builds)

## Key Configuration

### Vite Dev Server

- Fixed port `1420` (`strictPort: true`)
- HMR WebSocket port `1421`
- Environment variable `TAURI_DEV_HOST` controls host and HMR address
- Auto-ignores `src-tauri/**` directory watching
- `clearScreen: false` to avoid obscuring Rust compilation errors
- Path alias `@` → `./src`
- Integrated `@tailwindcss/vite` plugin

### Tauri App Configuration

- App identifier: `io.qingtian.appbox`
- Default window: 800×600, title `AppBox`
- Build targets: all platforms (`targets: "all"`)
- Frontend output directory: `../dist`

### TypeScript Configuration

- Target: ES2020
- Module resolution: bundler mode
- JSX: `react-jsx`
- Strict mode enabled
- Path alias: `@/*` → `./src/*`

### shadcn/ui Configuration

- Style: `radix-nova`
- Base color: `neutral`
- CSS variables mode enabled
- Icon library: Lucide
- Component directory: `@/components/ui`

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + the following extensions:
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) — Tauri project support
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) — Rust language support
  - [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) — Tailwind IntelliSense

## Resources

- [Tauri Documentation](https://tauri.app/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
