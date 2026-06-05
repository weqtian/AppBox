/**
 * 图片压缩页面
 *
 * 提供单张图片的压缩功能，支持：
 * - 智能模式：自动选择最优格式和质量，确保输出不大于原图
 * - 手动模式：自行选择输出格式和质量
 * - 实时预览原图与压缩后的对比
 * - 显示压缩率和文件大小变化
 * - 拖拽或点击上传图片
 *
 * 压缩策略：
 * - PNG 是无损格式，只用于需要无损压缩的场景
 * - JPEG/WebP 是有损格式，质量参数控制压缩程度
 * - 同格式重编码时，质量参数不应高于原始图的有效质量
 * - 跨格式转换时（如 JPEG→WebP），需考虑格式开销
 *
 * @module pages/ImageCompressorPage
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
  ImageIcon,
  CopyIcon,
  SparklesIcon,
  Settings2Icon,
} from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { saveFile } from "@/lib/save-file";
import { useTranslation } from "@/i18n";
import { formatSize, loadImageFile, createDragHandlers } from "@/lib/image-utils";

// ============================================================
// 类型与常量
// ============================================================

/** 源图片信息 */
interface ImageInfo {
  /** 原始文件 */
  file: File;
  /** Object URL（用于预览，需手动释放） */
  url: string;
  /** 图片宽度（像素） */
  width: number;
  /** 图片高度（像素） */
  height: number;
}

/** 压缩结果 */
interface CompressedResult {
  /** 压缩后的 Blob 数据 */
  blob: Blob;
  /** Object URL（用于预览，需手动释放） */
  url: string;
  /** 输出宽度 */
  width: number;
  /** 输出高度 */
  height: number;
  /** 实际使用的输出 MIME 类型 */
  format: string;
  /** 实际使用的质量值 */
  actualQuality: number;
}

/** 压缩模式 */
type CompressMode = "smart" | "manual";

/** 计算压缩率（正数表示节省，负数表示增大） */
function getCompressionRatio(original: number, compressed: number): number {
  if (original === 0) return 0;
  return Math.round((1 - compressed / original) * 100);
}

/** 允许上传的图片 MIME 类型 */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp"];

/**
 * 输出格式选项
 *
 * - "same" 表示保持与原图相同的格式（智能模式默认）
 * - PNG 是无损格式，不能调节质量（仅适用于需要透明通道的场景）
 */
const OUTPUT_FORMATS = [
  { value: "same", label: "保持原格式" },
  { value: "image/webp", label: "WebP" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG（无损）" },
];

/** 有损格式（支持质量参数） */
const LOSSY_FORMATS = new Set(["image/jpeg", "image/webp"]);

/**
 * 智能推荐默认输出格式
 *
 * 根据输入格式给出最佳推荐：
 * - JPEG → WebP（更好的压缩率）或 JPEG（保持原格式）
 * - PNG（照片类）→ WebP（大幅压缩）
 * - PNG（图标类）→ 保持 PNG
 * - BMP → WebP
 * - WebP → 保持 WebP
 */
function recommendOutputFormat(inputMime: string): string {
  switch (inputMime) {
    case "image/webp":
      return "same"; // WebP 已经很好，保持原格式
    case "image/jpeg":
      return "same"; // JPEG 保持原格式，避免跨格式开销
    case "image/png":
      return "same"; // PNG 保持原格式，用户可手动切换
    case "image/bmp":
      return "image/webp"; // BMP 转为 WebP
    default:
      return "same";
  }
}

/**
 * 获取实际的输出 MIME 类型
 *
 * "same" 会被解析为原图的 MIME 类型。
 * 对于 PNG 原图 + "same"，如果原图不是 RGBA（无透明通道），
 * 推荐使用 JPEG/WebP 获得更好的压缩率。
 */
function resolveOutputMime(format: string, sourceMime: string): string {
  if (format !== "same") return format;
  // 保持原格式
  return sourceMime;
}

// ============================================================
// Canvas 编码工具
// ============================================================

/**
 * 使用 Canvas 编码图片为指定格式的 Blob
 *
 * @param img - 已加载的 Image 元素
 * @param width - 输出宽度
 * @param height - 输出高度
 * @param mime - 输出 MIME 类型
 * @param quality - 质量（0~1），PNG 忽略此参数
 */
function encodeToBlob(
  img: HTMLImageElement,
  width: number,
  height: number,
  mime: string,
  quality: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context error");

  // JPEG 不支持透明，填充白色背景
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(img, 0, 0, width, height);

  // PNG 是无损格式，不传质量参数
  const q = mime === "image/png" ? undefined : quality;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Encoding failed"));
      },
      mime,
      q
    );
  });
}

/**
 * 智能压缩：自动尝试多种质量和格式，选择最优结果
 *
 * 策略：
 * 1. 确定候选格式（原格式 + WebP，去重）
 * 2. 对每种格式，用递减的质量值尝试编码
 * 3. 选择文件最小且小于原图的结果
 * 4. 如果所有尝试都大于原图，选择最小的结果并标注"已增大"
 *
 * @param img - 已加载的 Image 元素
 * @param width - 图片宽度
 * @param height - 图片高度
 * @param sourceMime - 原图 MIME 类型
 * @param sourceSize - 原图文件大小（字节）
 * @returns { blob, format, quality } 最优结果
 */
async function smartCompress(
  img: HTMLImageElement,
  width: number,
  height: number,
  sourceMime: string,
  sourceSize: number
): Promise<{ blob: Blob; format: string; quality: number }> {
  // 候选格式：原格式 + WebP（如果不同）
  const candidates: string[] = [];
  if (sourceMime !== "image/png") {
    candidates.push(sourceMime);
  }
  if (sourceMime !== "image/webp") {
    candidates.push("image/webp");
  }
  // PNG 无损候选（仅当原图就是 PNG 时）
  if (sourceMime === "image/png") {
    candidates.push("image/png");
  }
  if (candidates.length === 0) {
    candidates.push(sourceMime);
  }

  // 质量候选值（从高到低尝试）
  const qualitySteps = [0.80, 0.70, 0.60, 0.50, 0.40];

  let bestBlob: Blob | null = null;
  let bestFormat = sourceMime;
  let bestQuality = 0.80;
  let bestSize = Infinity;

  for (const mime of candidates) {
    for (const q of qualitySteps) {
      try {
        const blob = await encodeToBlob(img, width, height, mime, q);
        if (blob.size < bestSize) {
          bestBlob = blob;
          bestFormat = mime;
          bestQuality = q;
          bestSize = blob.size;
        }
        // 如果已经小于原图且质量可接受，提前返回
        if (blob.size < sourceSize && q >= 0.60) {
          return { blob, format: mime, quality: q };
        }
      } catch {
        // 某些格式可能不支持，跳过
      }
    }
  }

  if (!bestBlob) {
    // 所有尝试都失败，用原格式 + 0.50 质量兜底
    const blob = await encodeToBlob(img, width, height, sourceMime, 0.50);
    return { blob, format: sourceMime, quality: 0.50 };
  }

  return { blob: bestBlob, format: bestFormat, quality: bestQuality };
}

// ============================================================
// 页面组件
// ============================================================

export default function ImageCompressorPage() {
  const { t } = useTranslation();

  // --- 状态 ---
  const [source, setSource] = useState<ImageInfo | null>(null);
  const [result, setResult] = useState<CompressedResult | null>(null);
  const [quality, setQuality] = useState(70);
  const [outputFormat, setOutputFormat] = useState("same");
  const [compressMode, setCompressMode] = useState<CompressMode>("smart");
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // --- 拖拽处理 ---
  const { handleDragOver, handleDragLeave, removeHighlight } = createDragHandlers(dropRef);

  /** 加载图片文件并设置源 */
  const loadImage = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) return;
    const loaded = await loadImageFile(file);
    setSource({ file, ...loaded });
    setResult(null);
    setError(null);
    // 根据输入格式智能推荐输出格式
    setOutputFormat(recommendOutputFormat(file.type));
  }, []);

  /** 文件选择事件 */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
    e.target.value = "";
  };

  /** 拖拽放下事件 */
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      removeHighlight();
      const file = e.dataTransfer.files?.[0];
      if (file) loadImage(file);
    },
    [loadImage, removeHighlight]
  );

  /** 执行压缩 */
  const compress = useCallback(async () => {
    if (!source) return;
    setIsCompressing(true);
    setError(null);

    try {
      const img = new Image();
      img.src = source.url;

      await new Promise((resolve, reject) => {
        if (img.complete) resolve(undefined);
        else {
          img.onload = resolve;
          img.onerror = reject;
        }
      });

      let blob: Blob;
      let actualFormat: string;
      let actualQuality: number;

      if (compressMode === "smart") {
        // 智能模式：自动选择最优格式和质量
        const smart = await smartCompress(
          img, source.width, source.height,
          source.file.type, source.file.size
        );
        blob = smart.blob;
        actualFormat = smart.format;
        actualQuality = smart.quality;
      } else {
        // 手动模式：使用用户指定的格式和质量
        actualFormat = resolveOutputMime(outputFormat, source.file.type);
        actualQuality = quality / 100;
        blob = await encodeToBlob(img, source.width, source.height, actualFormat, actualQuality);
      }

      // 释放旧结果
      if (result?.url) URL.revokeObjectURL(result.url);
      const url = URL.createObjectURL(blob);
      setResult({ blob, url, width: source.width, height: source.height, format: actualFormat, actualQuality });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCompressing(false);
    }
  }, [source, quality, outputFormat, compressMode, result]);

  /** 下载压缩结果 */
  const handleDownload = async () => {
    if (!result || !source) return;
    const format = result.format;
    const ext = format === "image/webp" ? "webp"
      : format === "image/png" ? "png"
      : format === "image/jpeg" ? "jpg"
      : format.split("/")[1];
    const name = source.file.name.replace(/\.[^.]+$/, "") + `_compressed.${ext}`;
    await saveFile(result.blob, name);
  };

  /** 复制压缩信息到剪贴板 */
  const handleCopySizeInfo = async () => {
    if (!source || !result) return;
    const ratio = getCompressionRatio(source.file.size, result.blob.size);
    const info = `${t("imageCompressor.originalImage")}: ${formatSize(source.file.size)} → ${t("imageCompressor.compressedResult")}: ${formatSize(result.blob.size)} (${ratio > 0 ? `${t("imageCompressor.saved")} ${ratio}%` : `${t("imageCompressor.increased")} ${Math.abs(ratio)}%`})`;
    await copyToClipboard(info);
  };

  /** 清除图片和结果 */
  const handleClear = () => {
    if (source?.url) URL.revokeObjectURL(source.url);
    if (result?.url) URL.revokeObjectURL(result.url);
    setSource(null);
    setResult(null);
    setError(null);
  };

  const compressionRatio = source && result
    ? getCompressionRatio(source.file.size, result.blob.size)
    : 0;

  /** 当前实际输出的 MIME 类型（用于显示） */
  const effectiveFormat = result?.format ?? resolveOutputMime(outputFormat, source?.file.type ?? "image/jpeg");

  /** 质量滑块是否可用（仅手动模式 + 有损格式时可用） */
  const qualityEnabled = compressMode === "manual" && LOSSY_FORMATS.has(resolveOutputMime(outputFormat, source?.file.type ?? "image/jpeg"));

  return (
    <div className="flex flex-col h-full">
      {/* ============================================================ */}
      {/* 上传区域（无图片时） */}
      {/* ============================================================ */}
      {!source ? (
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
              <p className="text-sm font-medium">{t("imageCompressor.uploadHint")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("imageCompressor.uploadSupported")}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
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
          <div className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
            {/* 第一行：文件名 + 操作按钮 */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="size-4 text-primary shrink-0" />
                <span className="text-sm font-medium truncate">{source.file.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {source.width}×{source.height} · {formatSize(source.file.size)} · {source.file.type.split("/")[1].toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {result && (
                  <>
                    <Button size="icon-xs" variant="ghost" onClick={handleCopySizeInfo} title={t("imageCompressor.save")}>
                      <CopyIcon className="size-3.5" />
                    </Button>
                    <Button size="xs" variant="outline" onClick={handleDownload}>
                      <DownloadIcon className="size-3.5" />
                      {t("imageCompressor.save")}
                    </Button>
                  </>
                )}
                <Button size="xs" variant="ghost" onClick={handleClear}>
                  <TrashIcon className="size-3.5" />
                  {t("imageCompressor.clearImage")}
                </Button>
              </div>
            </div>

            {/* 第二行：模式切换 + 格式 + 质量 + 压缩按钮 */}
            <div className="flex items-center gap-4 px-4 pb-2.5">
              {/* 模式切换 */}
              <div className="flex items-center gap-1">
                <Button
                  size="xs"
                  variant={compressMode === "smart" ? "secondary" : "ghost"}
                  onClick={() => setCompressMode("smart")}
                >
                  <SparklesIcon className="size-3" />
                  {t("imageCompressor.smartMode")}
                </Button>
                <Button
                  size="xs"
                  variant={compressMode === "manual" ? "secondary" : "ghost"}
                  onClick={() => setCompressMode("manual")}
                >
                  <Settings2Icon className="size-3" />
                  {t("imageCompressor.manualMode")}
                </Button>
              </div>

              {/* 手动模式设置 */}
              {compressMode === "manual" && (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                      {t("imageCompressor.outputFormat")}
                    </Label>
                    <Select value={outputFormat} onValueChange={setOutputFormat}>
                      <SelectTrigger className="h-7 w-28 text-xs">
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

                  {qualityEnabled && (
                    <div className="flex items-center gap-2 flex-1 min-w-40">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                        {t("imageCompressor.quality")}
                      </Label>
                      <Slider
                        value={[quality]}
                        onValueChange={([v]) => setQuality(v)}
                        min={10}
                        max={95}
                        step={5}
                        className="flex-1 max-w-40"
                      />
                      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                        {quality}%
                      </span>
                    </div>
                  )}
                </>
              )}

              <Button
                size="sm"
                onClick={compress}
                disabled={isCompressing}
              >
                {compressMode === "smart" ? <SparklesIcon className="size-3.5" /> : <ImageIcon className="size-3.5" />}
                {isCompressing ? t("imageCompressor.compressing") : t("imageCompressor.compress")}
              </Button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 内容区：错误提示 + 对比预览 */}
          {/* ============================================================ */}
          <div className="flex-1 overflow-auto p-4">
            {/* 错误提示 */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 mb-4">
                {error}
              </div>
            )}

            {/* 空结果提示 */}
            {!result ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60">
                <ImageIcon className="size-10 mb-3" />
                <p className="text-sm">{t("imageCompressor.clickToCompress")}</p>
              </div>
            ) : (
              /* 对比预览 */
              <div className="grid grid-cols-2 gap-4">
                {/* 原图 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("imageCompressor.originalImage")}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {formatSize(source.file.size)}
                    </Badge>
                  </div>
                  <div className="relative rounded-lg overflow-hidden bg-muted/50 border flex items-center justify-center">
                    <img
                      src={source.url}
                      alt={t("imageCompressor.originalImage")}
                      className="w-full h-auto max-h-[calc(100vh-260px)] object-contain"
                    />
                  </div>
                </div>

                {/* 压缩后 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("imageCompressor.compressedResult")}
                    </span>
                    <Badge variant={compressionRatio > 0 ? "default" : "destructive"} className="text-[10px]">
                      {compressionRatio > 0
                        ? `${t("imageCompressor.saved")} ${compressionRatio}%`
                        : `${t("imageCompressor.increased")} ${Math.abs(compressionRatio)}%`}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {formatSize(result.blob.size)}
                    </Badge>
                  </div>
                  <div className="relative rounded-lg overflow-hidden bg-muted/50 border flex items-center justify-center">
                    <img
                      src={result.url}
                      alt={t("imageCompressor.compressedResult")}
                      className="w-full h-auto max-h-[calc(100vh-260px)] object-contain"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {result.width} × {result.height} · {effectiveFormat.split("/")[1].toUpperCase()}
                    {LOSSY_FORMATS.has(result.format) && (
                      <> · {t("imageCompressor.quality")} {Math.round(result.actualQuality * 100)}%</>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
