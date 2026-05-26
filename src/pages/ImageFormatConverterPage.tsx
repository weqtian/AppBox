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
  ArrowRightLeftIcon,
  XIcon,
} from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";

interface ImageFormatConverterPageProps {
  onCopy: () => void;
}

interface SourceImage {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
}

interface ConvertedResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

interface ConversionItem {
  source: SourceImage;
  result: ConvertedResult | null;
  status: "pending" | "converting" | "done" | "error";
  error?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const INPUT_ACCEPT = "image/jpeg,image/png,image/webp,image/bmp,image/gif,image/avif,image/svg+xml";

const INPUT_FORMATS = [
  { mime: "image/jpeg", label: "JPEG", ext: "jpg" },
  { mime: "image/png", label: "PNG", ext: "png" },
  { mime: "image/webp", label: "WebP", ext: "webp" },
  { mime: "image/bmp", label: "BMP", ext: "bmp" },
  { mime: "image/gif", label: "GIF", ext: "gif" },
  { mime: "image/avif", label: "AVIF", ext: "avif" },
  { mime: "image/svg+xml", label: "SVG", ext: "svg" },
];

const OUTPUT_FORMATS = [
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
  { value: "image/webp", label: "WebP" },
  { value: "image/avif", label: "AVIF" },
  { value: "image/bmp", label: "BMP" },
];

// 需要质量参数的格式
const QUALITY_FORMATS = new Set(["image/jpeg", "image/webp", "image/avif"]);

function getFormatLabel(mime: string): string {
  return INPUT_FORMATS.find((f) => f.mime === mime)?.label ?? mime.split("/")[1].toUpperCase();
}

function getOutputExt(mime: string): string {
  const f = OUTPUT_FORMATS.find((f) => f.value === mime);
  if (f) return f.label.toLowerCase();
  return mime.split("/")[1];
}

let idCounter = 0;
function nextId(): string {
  return `img_${++idCounter}_${Date.now()}`;
}

/**
 * 高性能图片格式转换核心函数
 * 使用 createImageBitmap + OffscreenCanvas 加速
 */
async function convertImage(
  sourceUrl: string,
  sourceWidth: number,
  sourceHeight: number,
  outputFormat: string,
  quality: number
): Promise<Blob> {
  // Step 1: 使用 createImageBitmap 快速解码（比 Image 元素更高效）
  const response = await fetch(sourceUrl);
  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);

  const width = imageBitmap.width || sourceWidth;
  const height = imageBitmap.height || sourceHeight;

  // Step 2: 优先使用 OffscreenCanvas（不阻塞主线程渲染）
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

  if (!ctx) throw new Error("无法创建 Canvas 上下文");

  // JPEG/BMP 不支持透明，填充白色背景
  if (outputFormat === "image/jpeg" || outputFormat === "image/bmp") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close();

  // Step 3: 编码输出
  const q = QUALITY_FORMATS.has(outputFormat) ? quality / 100 : undefined;

  if (canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob(
      { type: outputFormat, quality: q }
    );
  } else {
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("格式转换失败"));
        },
        outputFormat,
        q
      );
    });
  }
}

export default function ImageFormatConverterPage({ onCopy }: ImageFormatConverterPageProps) {
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [outputFormat, setOutputFormat] = useState("image/png");
  const [quality, setQuality] = useState(85);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalToConvert, setTotalToConvert] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const loadImage = useCallback((file: File): Promise<SourceImage> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({
          id: nextId(),
          file,
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => {
        resolve({
          id: nextId(),
          file,
          url,
          width: 0,
          height: 0,
        });
      };
      img.src = url;
    });
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const newSources = await Promise.all(files.map(loadImage));
    setItems((prev) => [
      ...prev,
      ...newSources.map((source) => ({ source, result: null, status: "pending" as const })),
    ]);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      dropRef.current?.classList.remove("border-primary", "bg-primary/5");
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
      const newSources = await Promise.all(files.map(loadImage));
      setItems((prev) => [
        ...prev,
        ...newSources.map((source) => ({ source, result: null, status: "pending" as const })),
      ]);
    },
    [loadImage]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    dropRef.current?.classList.add("border-primary", "bg-primary/5");
  };

  const handleDragLeave = () => {
    dropRef.current?.classList.remove("border-primary", "bg-primary/5");
  };

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

  const clearAll = () => {
    items.forEach((item) => {
      URL.revokeObjectURL(item.source.url);
      if (item.result?.url) URL.revokeObjectURL(item.result.url);
    });
    setItems([]);
    setProgress(0);
    setTotalToConvert(0);
  };

  const convertAll = useCallback(async () => {
    const pending = items.filter((i) => i.status === "pending" || i.status === "error");
    if (pending.length === 0) return;

    setIsConverting(true);
    setTotalToConvert(pending.length);
    setProgress(0);

    let completed = 0;

    for (const item of pending) {
      // 标记当前项为 converting
      setItems((prev) =>
        prev.map((i) =>
          i.source.id === item.source.id ? { ...i, status: "converting" } : i
        )
      );

      try {
        // 使用 requestAnimationFrame 让浏览器有机会更新 UI
        await new Promise((r) => requestAnimationFrame(r));

        const resultBlob = await convertImage(
          item.source.url,
          item.source.width,
          item.source.height,
          outputFormat,
          quality
        );

        const resultUrl = URL.createObjectURL(resultBlob);
        const result: ConvertedResult = {
          blob: resultBlob,
          url: resultUrl,
          width: item.source.width,
          height: item.source.height,
        };

        // 释放旧结果
        setItems((prev) =>
          prev.map((i) => {
            if (i.source.id === item.source.id) {
              if (i.result?.url) URL.revokeObjectURL(i.result.url);
              return { ...i, result, status: "done" };
            }
            return i;
          })
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "转换失败";
        setItems((prev) =>
          prev.map((i) =>
            i.source.id === item.source.id
              ? { ...i, status: "error", error: errorMsg }
              : i
          )
        );
      }

      completed++;
      setProgress(Math.round((completed / pending.length) * 100));
    }

    setIsConverting(false);
  }, [items, outputFormat, quality]);

  const handleDownload = (item: ConversionItem) => {
    if (!item.result) return;
    const ext = getOutputExt(outputFormat);
    const name = item.source.file.name.replace(/\.[^.]+$/, "") + `_converted.${ext}`;
    const a = document.createElement("a");
    a.href = item.result.url;
    a.download = name;
    a.click();
  };

  const handleDownloadAll = () => {
    items
      .filter((i) => i.status === "done" && i.result)
      .forEach((item) => handleDownload(item));
  };

  const handleCopyInfo = async (item: ConversionItem) => {
    if (!item.result) return;
    const info = `${item.source.file.name} (${formatSize(item.source.file.size)}) → ${getFormatLabel(outputFormat)} (${formatSize(item.result.blob.size)})`;
    await copyToClipboard(info);
    onCopy();
  };

  const pendingCount = items.filter((i) => i.status === "pending" || i.status === "error").length;
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* 上传区域 */}
      {items.length === 0 ? (
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
            <p className="text-sm font-medium">点击上传或拖拽图片到此处</p>
            <p className="text-xs text-muted-foreground mt-1">
              支持 JPEG、PNG、WebP、BMP、GIF、AVIF、SVG，可多选
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
      ) : (
        <>
          {/* 控制栏 */}
          <Card>
            <CardHeader>
              <CardTitle>格式转换设置</CardTitle>
              <CardAction>
                <div className="flex gap-1">
                  <Button size="xs" variant="ghost" onClick={clearAll}>
                    <TrashIcon data-icon="inline-start" />
                    清除全部
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadIcon data-icon="inline-start" />
                    添加图片
                  </Button>
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-6">
                <div className="space-y-2">
                  <Label>输出格式</Label>
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

                {QUALITY_FORMATS.has(outputFormat) && (
                  <div className="flex-1 min-w-48 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>输出质量</Label>
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
                      <span>高压缩</span>
                      <span>高质量</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 items-center">
                  <Button
                    onClick={convertAll}
                    disabled={isConverting || pendingCount === 0}
                  >
                    <ArrowRightLeftIcon data-icon="inline-start" />
                    {isConverting
                      ? `转换中 ${progress}%`
                      : `转换${pendingCount > 0 ? ` (${pendingCount}张)` : ""}`}
                  </Button>
                  {doneCount > 0 && (
                    <Button variant="outline" onClick={handleDownloadAll}>
                      <DownloadIcon data-icon="inline-start" />
                      下载全部
                    </Button>
                  )}
                </div>
              </div>

              {/* 进度条 */}
              {isConverting && (
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>转换进度</span>
                    <span>{progress}% ({Math.round(progress / 100 * totalToConvert)}/{totalToConvert})</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 文件列表 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <Card key={item.source.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    {/* 缩略图 */}
                    <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted/50 border">
                      <img
                        src={item.source.url}
                        alt={item.source.file.name}
                        className="w-full h-full object-cover"
                      />
                      {/* 转换状态覆盖层 */}
                      {item.status === "converting" && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                          <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {item.status === "done" && (
                        <div className="absolute top-0.5 right-0.5">
                          <Badge variant="default" className="text-[10px] px-1 py-0 leading-tight">
                            ✓
                          </Badge>
                        </div>
                      )}
                      {item.status === "error" && (
                        <div className="absolute top-0.5 right-0.5">
                          <Badge variant="destructive" className="text-[10px] px-1 py-0 leading-tight">
                            ✗
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={item.source.file.name}>
                        {item.source.file.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <span>{item.source.width}×{item.source.height}</span>
                        <span>·</span>
                        <span>{formatSize(item.source.file.size)}</span>
                        <span>·</span>
                        <span>{getFormatLabel(item.source.file.type)}</span>
                      </div>
                      {item.status === "done" && item.result && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <span>→</span>
                          <span>{getFormatLabel(outputFormat)}</span>
                          <span>·</span>
                          <span>{formatSize(item.result.blob.size)}</span>
                          {item.source.file.size > 0 && (
                            <>
                              <span>·</span>
                              <span className={item.result.blob.size < item.source.file.size ? "text-green-600" : "text-orange-500"}>
                                {item.result.blob.size < item.source.file.size ? "↓" : "↑"}
                                {Math.abs(Math.round((1 - item.result.blob.size / item.source.file.size) * 100))}%
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      {item.status === "error" && (
                        <p className="text-xs text-destructive mt-1">{item.error}</p>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex flex-col gap-1">
                      {item.status === "done" && item.result && (
                        <>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleCopyInfo(item)}
                            title="复制信息"
                          >
                            <UploadIcon className="size-3.5 rotate-90" />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleDownload(item)}
                            title="保存"
                          >
                            <DownloadIcon className="size-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => removeItem(item.source.id)}
                        title="移除"
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* 添加更多卡片 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl p-4 cursor-pointer transition-colors hover:border-primary hover:bg-primary/5 min-h-[88px]"
            >
              <div className="text-center">
                <UploadIcon className="size-6 mx-auto text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground mt-1">添加图片</p>
              </div>
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
