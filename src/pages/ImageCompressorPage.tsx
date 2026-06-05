/**
 * 图片压缩页面
 *
 * 提供单张图片的压缩功能，支持：
 * - 调整压缩质量（10%~100%）
 * - 选择输出格式（JPEG / PNG / WebP）
 * - 实时预览原图与压缩后的对比
 * - 显示压缩率和文件大小变化
 * - 拖拽或点击上传图片
 *
 * @module pages/ImageCompressorPage
 */

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
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
  UploadIcon,
  DownloadIcon,
  TrashIcon,
  ImageIcon,
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
}

/** 计算压缩率（正数表示节省，负数表示增大） */
function getCompressionRatio(original: number, compressed: number): number {
  if (original === 0) return 0;
  return Math.round((1 - compressed / original) * 100);
}

/** 允许上传的图片 MIME 类型 */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp"];

/** 输出格式选项 */
const OUTPUT_FORMATS = [
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
  { value: "image/webp", label: "WebP" },
];

// ============================================================
// 页面组件
// ============================================================

export default function ImageCompressorPage() {
  const { t } = useTranslation();

  // --- 状态 ---
  const [source, setSource] = useState<ImageInfo | null>(null);
  const [result, setResult] = useState<CompressedResult | null>(null);
  const [quality, setQuality] = useState(80);
  const [outputFormat, setOutputFormat] = useState("image/webp");
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

      // 等待图片加载完成
      await new Promise((resolve, reject) => {
        if (img.complete) resolve(undefined);
        else {
          img.onload = resolve;
          img.onerror = reject;
        }
      });

      const canvas = document.createElement("canvas");
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("无法创建 Canvas 上下文");
      }

      // JPEG 不支持透明，填充白色背景避免透明区域变黑
      if (outputFormat === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // PNG 不支持质量参数
      const q = outputFormat === "image/png" ? undefined : quality / 100;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error(t("imageCompressor.compressing")));
          },
          outputFormat,
          q
        );
      });

      const url = URL.createObjectURL(blob);
      setResult({ blob, url, width: canvas.width, height: canvas.height });
    } catch (err) {
      // 向用户展示错误信息而非静默忽略
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCompressing(false);
    }
  }, [source, quality, outputFormat, t]);

  /** 下载压缩结果 */
  const handleDownload = async () => {
    if (!result || !source) return;
    const ext = outputFormat.split("/")[1];
    const name = source.file.name.replace(/\.[^.]+$/, "") + `_compressed.${ext}`;
    await saveFile(result.blob, name);
  };

  /** 复制压缩信息到剪贴板 */
  const handleCopySizeInfo = async () => {
    if (!source || !result) return;
    const ratio = getCompressionRatio(source.file.size, result.blob.size);
    const info = `${t("imageCompressor.originalImage")}: ${formatSize(source.file.size)} → ${t("imageCompressor.compressedResult")}: ${formatSize(result.blob.size)} (${t("imageCompressor.saved")} ${ratio}%)`;
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

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* 错误提示 */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* 上传区域 */}
      {!source ? (
        <div
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
        >
          <UploadIcon className="size-12 text-muted-foreground/50" />
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
      ) : (
        <>
          {/* 控制栏 */}
          <Card>
            <CardHeader>
              <CardTitle>{t("imageCompressor.settings")}</CardTitle>
              <CardAction>
                <Button size="xs" variant="ghost" onClick={handleClear}>
                  <TrashIcon data-icon="inline-start" />
                  {t("imageCompressor.clearImage")}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-6">
                <div className="flex-1 min-w-48 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t("imageCompressor.quality")}</Label>
                    <span className="text-sm text-muted-foreground tabular-nums">{quality}%</span>
                  </div>
                  <Slider
                    value={[quality]}
                    onValueChange={([v]) => setQuality(v)}
                    min={10}
                    max={100}
                    step={5}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t("imageCompressor.highCompression")}</span>
                    <span>{t("imageCompressor.highQuality")}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("imageCompressor.outputFormat")}</Label>
                  <Select value={outputFormat} onValueChange={setOutputFormat}>
                    <SelectTrigger className="w-28">
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
                <div className="flex gap-2">
                  <Button onClick={compress} disabled={isCompressing}>
                    <ImageIcon data-icon="inline-start" />
                    {isCompressing ? t("imageCompressor.compressing") : t("imageCompressor.compress")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 图片对比 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 原图 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {t("imageCompressor.originalImage")}
                  <Badge variant="secondary">{formatSize(source.file.size)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative rounded-lg overflow-hidden bg-muted/50 border">
                  <img
                    src={source.url}
                    alt={t("imageCompressor.originalImage")}
                    className="w-full h-auto max-h-80 object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {source.width} × {source.height} · {source.file.type.split("/")[1].toUpperCase()}
                </p>
              </CardContent>
            </Card>

            {/* 压缩后 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {t("imageCompressor.compressedResult")}
                  {result && (
                    <Badge variant={compressionRatio > 0 ? "default" : "destructive"}>
                      {compressionRatio > 0 ? `${t("imageCompressor.saved")} ${compressionRatio}%` : `${t("imageCompressor.increased")} ${Math.abs(compressionRatio)}%`}
                    </Badge>
                  )}
                </CardTitle>
                {result && (
                  <CardAction>
                    <div className="flex gap-1">
                      <Button size="icon-xs" variant="ghost" onClick={handleCopySizeInfo}>
                        <UploadIcon className="size-3.5" />
                      </Button>
                      <Button size="xs" variant="outline" onClick={handleDownload}>
                        <DownloadIcon data-icon="inline-start" />
                        {t("imageCompressor.save")}
                      </Button>
                    </div>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent>
                {result ? (
                  <>
                    <div className="relative rounded-lg overflow-hidden bg-muted/50 border">
                      <img
                        src={result.url}
                        alt={t("imageCompressor.compressedResult")}
                        className="w-full h-auto max-h-80 object-contain"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {result.width} × {result.height} · {formatSize(result.blob.size)} · {outputFormat.split("/")[1].toUpperCase()}
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                    {t("imageCompressor.clickToCompress")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
