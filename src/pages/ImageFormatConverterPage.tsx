/**
 * 图片格式转换页面
 *
 * 提供批量图片格式转换功能，支持：
 * - 多种输入格式（JPEG/PNG/WebP/BMP/GIF/AVIF/SVG）
 * - 多种输出格式（JPEG/PNG/WebP/AVIF/BMP）
 * - 批量上传与批量下载
 * - 质量参数调整（针对 JPEG/WebP/AVIF）
 * - 拖拽上传
 * - 逐项转换进度显示
 * - 修改设置后支持重新转换
 *
 * 使用 createImageBitmap + OffscreenCanvas 实现高性能转换。
 *
 * @module pages/ImageFormatConverterPage
 */

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DownloadIcon,
  TrashIcon,
  ArrowRightLeftIcon,
  XIcon,
  PlusIcon,
  RefreshCwIcon,
  ImageIcon,
  CopyIcon,
} from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { saveFile } from "@/lib/save-file";
import { useTranslation } from "@/i18n";
import { formatSize, loadImageFile, createDragHandlers } from "@/lib/image-utils";

// ============================================================
// 类型定义
// ============================================================

/** 源图片数据 */
interface SourceImage {
  /** 唯一标识 */
  id: string;
  /** 原始文件 */
  file: File;
  /** Object URL（用于预览，需手动释放） */
  url: string;
  /** 图片宽度（像素） */
  width: number;
  /** 图片高度（像素） */
  height: number;
}

/** 转换结果 */
interface ConvertedResult {
  /** 转换后的 Blob 数据 */
  blob: Blob;
  /** Object URL（用于预览，需手动释放） */
  url: string;
  /** 输出宽度 */
  width: number;
  /** 输出高度 */
  height: number;
}

/** 转换单项的状态 */
interface ConversionItem {
  /** 源图片信息 */
  source: SourceImage;
  /** 转换结果（完成后存在） */
  result: ConvertedResult | null;
  /** 当前状态 */
  status: "pending" | "converting" | "done" | "error";
  /** 错误信息（状态为 error 时存在） */
  error?: string;
}

// ============================================================
// 常量
// ============================================================

/** 文件选择器接受的 MIME 类型 */
const INPUT_ACCEPT = "image/jpeg,image/png,image/webp,image/bmp,image/gif,image/avif,image/svg+xml";

/** 输入格式信息（用于显示） */
const INPUT_FORMATS = [
  { mime: "image/jpeg", label: "JPEG", ext: "jpg" },
  { mime: "image/png", label: "PNG", ext: "png" },
  { mime: "image/webp", label: "WebP", ext: "webp" },
  { mime: "image/bmp", label: "BMP", ext: "bmp" },
  { mime: "image/gif", label: "GIF", ext: "gif" },
  { mime: "image/avif", label: "AVIF", ext: "avif" },
  { mime: "image/svg+xml", label: "SVG", ext: "svg" },
];

/** 输出格式选项 */
const OUTPUT_FORMATS = [
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
  { value: "image/webp", label: "WebP" },
  { value: "image/avif", label: "AVIF" },
  { value: "image/bmp", label: "BMP" },
];

/** 需要质量参数的格式 */
const QUALITY_FORMATS = new Set(["image/jpeg", "image/webp", "image/avif"]);

/** 根据 MIME 获取格式显示名称 */
function getFormatLabel(mime: string): string {
  return INPUT_FORMATS.find((f) => f.mime === mime)?.label ?? mime.split("/")[1].toUpperCase();
}

/** 根据输出 MIME 获取扩展名 */
function getOutputExt(mime: string): string {
  const f = OUTPUT_FORMATS.find((f) => f.value === mime);
  if (f) return f.label.toLowerCase();
  return mime.split("/")[1];
}

// ============================================================
// 核心转换函数
// ============================================================

/**
 * 高性能图片格式转换
 *
 * 使用 createImageBitmap + OffscreenCanvas 加速。
 */
async function convertImage(
  sourceUrl: string,
  sourceWidth: number,
  sourceHeight: number,
  outputFormat: string,
  quality: number,
  errorMessage: string
): Promise<Blob> {
  const response = await fetch(sourceUrl);
  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);

  const width = imageBitmap.width || sourceWidth;
  const height = imageBitmap.height || sourceHeight;

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(width, height);
    ctx = canvas.getContext("2d");
  } else {
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext("2d");
  }

  if (!ctx) throw new Error(errorMessage);

  // JPEG/BMP 不支持透明，填充白色背景
  if (outputFormat === "image/jpeg" || outputFormat === "image/bmp") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close();

  const q = QUALITY_FORMATS.has(outputFormat) ? quality / 100 : undefined;

  if (canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({ type: outputFormat, quality: q });
  } else {
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error(errorMessage));
        },
        outputFormat,
        q
      );
    });
  }
}

// ============================================================
// 页面组件
// ============================================================

export default function ImageFormatConverterPage() {
  const { t } = useTranslation();

  // --- 状态 ---
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [outputFormat, setOutputFormat] = useState("image/png");
  const [quality, setQuality] = useState(85);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // --- 拖拽处理 ---
  const { handleDragOver, handleDragLeave, removeHighlight } = createDragHandlers(dropRef);

  // --- 文件加载 ---
  const loadFile = useCallback(async (file: File): Promise<SourceImage> => {
    const loaded = await loadImageFile(file);
    return { id: crypto.randomUUID(), file, ...loaded };
  }, []);

  /** 文件选择事件 */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const newSources = await Promise.all(files.map(loadFile));
    setItems((prev) => [
      ...prev,
      ...newSources.map((source) => ({ source, result: null, status: "pending" as const })),
    ]);
    e.target.value = "";
  };

  /** 拖拽放下事件 */
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      removeHighlight();
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
      const newSources = await Promise.all(files.map(loadFile));
      setItems((prev) => [
        ...prev,
        ...newSources.map((source) => ({ source, result: null, status: "pending" as const })),
      ]);
    },
    [loadFile, removeHighlight]
  );

  /** 移除单个项目 */
  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.source.id === id);
      if (item) {
        URL.revokeObjectURL(item.source.url);
        if (item.result?.url) URL.revokeObjectURL(item.result.url);
      }
      return prev.filter((i) => i.source.id !== id);
    });
  };

  /** 清除所有项目 */
  const clearAll = () => {
    items.forEach((item) => {
      URL.revokeObjectURL(item.source.url);
      if (item.result?.url) URL.revokeObjectURL(item.result.url);
    });
    setItems([]);
    setProgress(0);
  };

  /**
   * 批量转换所有项
   *
   * 核心改动：转换所有项（不仅仅是 pending），包括已完成的项。
   * 这样在修改输出格式或质量后可以重新转换。
   */
  const convertAll = useCallback(async () => {
    if (items.length === 0) return;

    // 释放所有旧的 result URL
    setItems((prev) => prev.map((item) => {
      if (item.result?.url) URL.revokeObjectURL(item.result.url);
      return { ...item, result: null, status: "pending" as const, error: undefined };
    }));

    setIsConverting(true);
    setProgress(0);

    let completed = 0;

    for (const item of items) {
      // 标记当前项为 converting
      setItems((prev) =>
        prev.map((i) =>
          i.source.id === item.source.id ? { ...i, status: "converting" } : i
        )
      );

      try {
        // 让浏览器有机会更新 UI
        await new Promise((r) => requestAnimationFrame(r));

        const resultBlob = await convertImage(
          item.source.url,
          item.source.width,
          item.source.height,
          outputFormat,
          quality,
          t("imageFormatConverter.conversionFailed")
        );

        const resultUrl = URL.createObjectURL(resultBlob);
        const result: ConvertedResult = {
          blob: resultBlob,
          url: resultUrl,
          width: item.source.width,
          height: item.source.height,
        };

        setItems((prev) =>
          prev.map((i) =>
            i.source.id === item.source.id
              ? { ...i, result, status: "done" }
              : i
          )
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : t("imageFormatConverter.conversionError");
        setItems((prev) =>
          prev.map((i) =>
            i.source.id === item.source.id
              ? { ...i, status: "error", error: errorMsg }
              : i
          )
        );
      }

      completed++;
      setProgress(Math.round((completed / items.length) * 100));
    }

    setIsConverting(false);
  }, [items, outputFormat, quality, t]);

  /** 下载单个已转换图片 */
  const handleDownload = useCallback(async (item: ConversionItem) => {
    if (!item.result) return;
    const ext = getOutputExt(outputFormat);
    const name = item.source.file.name.replace(/\.[^.]+$/, "") + `_converted.${ext}`;
    await saveFile(item.result.blob, name);
  }, [outputFormat]);

  /** 下载所有已转换图片 */
  const handleDownloadAll = useCallback(async () => {
    const doneItems = items.filter((i) => i.status === "done" && i.result);
    for (const item of doneItems) {
      await handleDownload(item);
    }
  }, [items, handleDownload]);

  /** 复制转换信息 */
  const handleCopyInfo = async (item: ConversionItem) => {
    if (!item.result) return;
    const info = `${item.source.file.name} (${formatSize(item.source.file.size)}) → ${getFormatLabel(outputFormat)} (${formatSize(item.result.blob.size)})`;
    await copyToClipboard(info);
  };

  // --- 统计 ---
  const pendingCount = items.filter((i) => i.status === "pending" || i.status === "error").length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const allDone = items.length > 0 && pendingCount === 0 && errorCount === 0;

  // --- 转换按钮文案 ---
  const convertButtonLabel = isConverting
    ? `${t("imageFormatConverter.converting")} ${progress}%`
    : allDone
      ? `${t("imageFormatConverter.reconvert")} (${items.length}${t("imageFormatConverter.imagesUnit")})`
      : `${t("imageFormatConverter.convert")} (${items.length}${t("imageFormatConverter.imagesUnit")})`;

  return (
    <div className="flex flex-col h-full">
      {/* ============================================================ */}
      {/* 上传区域（无图片时显示） */}
      {/* ============================================================ */}
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-muted-foreground/25 rounded-xl p-16 w-full max-w-lg cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="rounded-full bg-primary/10 p-4">
              <ImageIcon className="size-10 text-primary/60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{t("imageFormatConverter.uploadHint")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("imageFormatConverter.uploadSupported")}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={INPUT_ACCEPT}
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      ) : (
        <>
          {/* ============================================================ */}
          {/* 顶部工具栏 */}
          {/* ============================================================ */}
          <div className="border-b bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
            {/* 第一行：标题 + 操作按钮 */}
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeftIcon className="size-4 text-primary" />
                <span className="text-sm font-semibold">{t("imageFormatConverter.settings")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="xs" variant="ghost" onClick={clearAll}>
                  <TrashIcon className="size-3.5" />
                  {t("imageFormatConverter.clearAll")}
                </Button>
                <Button size="xs" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <PlusIcon className="size-3.5" />
                  {t("imageFormatConverter.addImages")}
                </Button>
                {doneCount > 0 && (
                  <Button size="xs" variant="outline" onClick={handleDownloadAll}>
                    <DownloadIcon className="size-3.5" />
                    {t("imageFormatConverter.downloadAll")}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={convertAll}
                  disabled={isConverting}
                >
                  {isConverting ? (
                    <RefreshCwIcon className="size-3.5 animate-spin" />
                  ) : allDone ? (
                    <RefreshCwIcon className="size-3.5" />
                  ) : (
                    <ArrowRightLeftIcon className="size-3.5" />
                  )}
                  {convertButtonLabel}
                </Button>
              </div>
            </div>

            {/* 第二行：格式 + 质量 */}
            <div className="flex items-center gap-6 px-4 pb-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                  {t("imageFormatConverter.outputFormat")}
                </Label>
                <Select value={outputFormat} onValueChange={setOutputFormat}>
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {OUTPUT_FORMATS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {QUALITY_FORMATS.has(outputFormat) && (
                <div className="flex items-center gap-2 flex-1 min-w-48">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">
                    {t("imageFormatConverter.outputQuality")}
                  </Label>
                  <Slider
                    value={[quality]}
                    onValueChange={([v]) => setQuality(v)}
                    min={10}
                    max={100}
                    step={5}
                    className="flex-1 max-w-48"
                  />
                  <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                    {quality}%
                  </span>
                </div>
              )}
            </div>

            {/* 统计条 + 进度条 */}
            <div className="px-4 pb-2 flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{items.length} {t("imageFormatConverter.statsTotal")}</span>
                {doneCount > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span className="text-green-600 dark:text-green-400">{doneCount} {t("imageFormatConverter.statsDone")}</span>
                  </>
                )}
                {pendingCount > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span>{pendingCount} {t("imageFormatConverter.statsPending")}</span>
                  </>
                )}
                {errorCount > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span className="text-destructive">{errorCount} {t("imageFormatConverter.statsFailed")}</span>
                  </>
                )}
              </div>
              {isConverting && (
                <>
                  <div className="flex-1 h-1.5 rounded-full bg-primary/20 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
                </>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* 文件列表 */}
          {/* ============================================================ */}
          <div className="flex-1 overflow-auto">
            <div className="divide-y">
              {items.map((item) => (
                <div
                  key={item.source.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group"
                >
                  {/* 缩略图 */}
                  <div className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-muted/50 border">
                    <img
                      src={item.source.url}
                      alt={item.source.file.name}
                      className="w-full h-full object-cover"
                    />
                    {item.status === "converting" && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* 文件信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate" title={item.source.file.name}>
                        {item.source.file.name}
                      </p>
                      {/* 状态徽标 */}
                      {item.status === "done" && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 leading-tight shrink-0">
                          ✓ {getFormatLabel(outputFormat)}
                        </Badge>
                      )}
                      {item.status === "error" && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 leading-tight shrink-0">
                          ✗
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                      <span>{item.source.width}×{item.source.height}</span>
                      <span>·</span>
                      <span>{formatSize(item.source.file.size)}</span>
                      <span>·</span>
                      <span>{getFormatLabel(item.source.file.type)}</span>
                      {/* 转换结果信息 */}
                      {item.status === "done" && item.result && (
                        <>
                          <span className="text-border mx-0.5">→</span>
                          <span>{formatSize(item.result.blob.size)}</span>
                          {item.source.file.size > 0 && (
                            <>
                              <span>·</span>
                              <span className={item.result.blob.size < item.source.file.size ? "text-green-600 dark:text-green-400" : "text-orange-500"}>
                                {item.result.blob.size < item.source.file.size ? "↓" : "↑"}
                                {Math.abs(Math.round((1 - item.result.blob.size / item.source.file.size) * 100))}%
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                    {item.status === "error" && (
                      <p className="text-xs text-destructive mt-0.5">{item.error}</p>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {item.status === "done" && item.result && (
                      <>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => handleCopyInfo(item)}
                          title={t("imageFormatConverter.copyInfo")}
                        >
                          <CopyIcon className="size-3.5" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => handleDownload(item)}
                          title={t("imageFormatConverter.save")}
                        >
                          <DownloadIcon className="size-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => removeItem(item.source.id)}
                      title={t("imageFormatConverter.remove")}
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* 底部添加入口 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 border-t border-dashed border-muted-foreground/20 py-3 cursor-pointer transition-colors hover:bg-muted/30 text-muted-foreground/60 hover:text-muted-foreground"
            >
              <PlusIcon className="size-4" />
              <span className="text-xs">{t("imageFormatConverter.addMore")}</span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={INPUT_ACCEPT}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
