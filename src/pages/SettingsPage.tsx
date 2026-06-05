/**
 * 设置中心页面
 *
 * 提供应用的统一设置入口，包含四个分组卡片区域：
 * - 外观：主题切换（跟随系统 / 浅色 / 深色）
 * - 语言：界面显示语言选择
 * - 更新：自动更新检查、镜像选择、下载安装
 * - 关于：应用名称、描述、版本号
 *
 * 布局采用分组 Card 样式，每个卡片独立一个设置主题，
 * 卡片之间使用 Separator 分隔，清晰直观。
 *
 * @module pages/SettingsPage
 */

import { useTranslation, localeNames, type Locale } from "@/i18n";
import { useTheme, type ThemePreference } from "@/hooks/use-theme";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { BoxIcon, RefreshCwIcon, DownloadIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

/** 主题选项定义（key → i18n key 后缀） */
const themeOptions: { value: ThemePreference; labelKey: string }[] = [
  { value: "system", labelKey: "settings.themeSystem" },
  { value: "light", labelKey: "settings.themeLight" },
  { value: "dark", labelKey: "settings.themeDark" },
];

/** 镜像选项 */
const MIRROR_OPTIONS = [
  { value: "", label: "update.mirrorDirect" },
  { value: "https://gh-proxy.org", label: "gh-proxy.org" },
  { value: "https://v4.gh-proxy.org", label: "v4.gh-proxy.org" },
  { value: "https://v6.gh-proxy.org", label: "v6.gh-proxy.org" },
  { value: "https://cdn.gh-proxy.org", label: "cdn.gh-proxy.org" },
];

/** localStorage 中保存镜像偏好的 key */
const MIRROR_STORAGE_KEY = "appbox-mirror";

/** 更新状态 */
type UpdateStatus = "idle" | "checking" | "up-to-date" | "available" | "downloading" | "error";

/** 更新信息（从 Rust 返回） */
interface UpdateInfo {
  version: string;
  body: string | null;
  date: string | null;
}

/** 从 localStorage 读取已保存的镜像偏好 */
function getSavedMirror(): string {
  try {
    return localStorage.getItem(MIRROR_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/** 保存镜像偏好到 localStorage */
function saveMirror(value: string) {
  try {
    localStorage.setItem(MIRROR_STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

/**
 * 更新卡片组件
 *
 * 提供镜像选择、检查更新、下载安装功能。
 * 启动时自动延迟检查更新（非阻塞）。
 */
function UpdateSection() {
  const { t } = useTranslation();
  const [mirror, setMirror] = useState(getSavedMirror);
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const autoChecked = useRef(false);

  /** 检查更新 */
  const handleCheck = useCallback(async () => {
    setStatus("checking");
    setError(null);
    setUpdateInfo(null);
    try {
      const result = await invoke<UpdateInfo | null>("check_for_update", {
        mirror: mirror || null,
      });
      if (result) {
        setUpdateInfo(result);
        setStatus("available");
      } else {
        setStatus("up-to-date");
      }
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }, [mirror]);

  /** 下载并安装更新 */
  const handleInstall = useCallback(async () => {
    setStatus("downloading");
    setProgress(0);
    setError(null);

    let downloaded = 0;
    let total = 0;
    const appWindow = getCurrentWindow();

    // 监听下载开始事件（获取文件总大小）
    const unlistenStarted = await appWindow.listen<{ contentLength: number | null }>(
      "update-download-started",
      (event) => {
        if (event.payload.contentLength) {
          total = event.payload.contentLength;
        }
      }
    );

    // 监听下载进度事件
    const unlistenProgress = await appWindow.listen<{ chunkLength: number }>(
      "update-download-progress",
      (event) => {
        downloaded += event.payload.chunkLength;
        if (total > 0) {
          setProgress(Math.min(Math.round((downloaded / total) * 100), 100));
        }
      }
    );

    // 监听下载完成事件
    const unlistenFinished = await appWindow.listen(
      "update-download-finished",
      () => {
        setProgress(100);
      }
    );

    try {
      await invoke("perform_update", {
        mirror: mirror || null,
      });
      // perform_update 成功后会自动重启，以下代码通常不会执行
    } catch (e) {
      setError(String(e));
      setStatus("error");
    } finally {
      unlistenStarted();
      unlistenProgress();
      unlistenFinished();
    }
  }, [mirror]);

  /** 自动启动检查（延迟 3 秒，仅一次） */
  useEffect(() => {
    if (autoChecked.current) return;
    autoChecked.current = true;
    const timer = setTimeout(() => {
      handleCheck();
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 镜像切换 */
  const handleMirrorChange = useCallback((value: string) => {
    setMirror(value);
    saveMirror(value);
    // 切换镜像后重置状态
    setStatus("idle");
    setUpdateInfo(null);
    setError(null);
  }, []);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("update.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 镜像选择 */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label className="text-sm">{t("update.mirror")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("update.mirrorDesc")}
            </p>
          </div>
          <Select value={mirror || "direct"} onValueChange={(v) => handleMirrorChange(v === "direct" ? "" : v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MIRROR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || "direct"} value={opt.value || "direct"}>
                  {opt.value === ""
                    ? t("update.mirrorDirect" as Parameters<typeof t>[0])
                    : opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* 更新状态区域 */}
        <div className="space-y-3">
          {status === "idle" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleCheck}
            >
              <RefreshCwIcon className="size-4 mr-2" />
              {t("update.checkUpdate")}
            </Button>
          )}

          {status === "checking" && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <RefreshCwIcon className="size-4 animate-spin" />
              {t("update.checking")}
            </div>
          )}

          {status === "up-to-date" && (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircleIcon className="size-4" />
                {t("update.upToDate")}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCheck}
              >
                <RefreshCwIcon className="size-3.5 mr-1.5" />
                {t("update.checkUpdate")}
              </Button>
            </div>
          )}

          {status === "available" && updateInfo && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {t("update.newVersion")}:
                </span>
                <span className="font-medium">
                  v{updateInfo.version}
                </span>
              </div>
              {updateInfo.body && (
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {updateInfo.body}
                </p>
              )}
              <Button
                size="sm"
                className="w-full"
                onClick={handleInstall}
              >
                <DownloadIcon className="size-4 mr-2" />
                {t("update.downloadInstall")}
              </Button>
            </div>
          )}

          {status === "downloading" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("update.downloading")}
                </span>
                <span className="font-medium tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {status === "error" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircleIcon className="size-4 shrink-0" />
                <span className="line-clamp-2">{error || t("update.checkError")}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setError(null);
                  handleCheck();
                }}
              >
                <RefreshCwIcon className="size-3.5 mr-1.5" />
                {t("update.retry")}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col h-full">
      <div className="max-w-2xl mx-auto w-full p-6 space-y-6">
        {/* 页面标题 */}
        <h1 className="text-lg font-semibold">{t("settings.title")}</h1>

        {/* 外观设置 */}
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("settings.appearance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm">{t("settings.theme")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("settings.themeDesc")}
                </p>
              </div>
              <Select value={theme} onValueChange={(v) => setTheme(v as ThemePreference)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {themeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* 语言设置 */}
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("settings.language")}</CardTitle>
            <CardDescription>{t("settings.languageDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(localeNames) as [Locale, string][]).map(([key, name]) => (
                  <SelectItem key={key} value={key}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Separator />

        {/* 更新设置 */}
        <UpdateSection />

        <Separator />

        {/* 关于 */}
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("settings.about")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 应用图标 + 名称 + 描述 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
                <BoxIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">AppBox</p>
                <p className="text-xs text-muted-foreground">
                  {t("settings.appDescription")}
                </p>
              </div>
            </div>

            <Separator />

            {/* 版本号 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("settings.version")}
              </span>
              <span className="text-sm font-medium">
                v{__APP_VERSION__}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
