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

interface ImageCompressorPageProps {
  onCopy: () => void;
}

interface ImageInfo {
  file: File;
  url: string;
  width: number;
  height: number;
}

interface CompressedResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getCompressionRatio(original: number, compressed: number): number {
  if (original === 0) return 0;
  return Math.round((1 - compressed / original) * 100);
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp"];
const OUTPUT_FORMATS = [
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
  { value: "image/webp", label: "WebP" },
];

export default function ImageCompressorPage({ onCopy }: ImageCompressorPageProps) {
  const [source, setSource] = useState<ImageInfo | null>(null);
  const [result, setResult] = useState<CompressedResult | null>(null);
  const [quality, setQuality] = useState(80);
  const [outputFormat, setOutputFormat] = useState("image/webp");
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const loadImage = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setSource({ file, url, width: img.naturalWidth, height: img.naturalHeight });
      setResult(null);
    };
    img.src = url;
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dropRef.current?.classList.remove("border-primary", "bg-primary/5");
      const file = e.dataTransfer.files?.[0];
      if (file) loadImage(file);
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

  const compress = useCallback(async () => {
    if (!source) return;
    setIsCompressing(true);

    try {
      const img = new Image();
      img.src = source.url;

      await new Promise((resolve) => {
        if (img.complete) resolve(undefined);
        else img.onload = resolve;
      });

      const canvas = document.createElement("canvas");
      canvas.width = source.width;
      canvas.height = source.height;
      const ctx = canvas.getContext("2d")!;

      // 对于 JPEG，先填充白色背景（避免透明变黑）
      if (outputFormat === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const q = outputFormat === "image/png" ? undefined : quality / 100;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error("压缩失败"));
          },
          outputFormat,
          q
        );
      });

      const url = URL.createObjectURL(blob);
      setResult({ blob, url, width: canvas.width, height: canvas.height });
    } catch (err) {
      console.error("压缩出错:", err);
    } finally {
      setIsCompressing(false);
    }
  }, [source, quality, outputFormat]);

  const handleDownload = () => {
    if (!result || !source) return;
    const ext = outputFormat.split("/")[1];
    const name = source.file.name.replace(/\.[^.]+$/, "") + `_compressed.${ext}`;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = name;
    a.click();
  };

  const handleCopySizeInfo = async () => {
    if (!source || !result) return;
    const ratio = getCompressionRatio(source.file.size, result.blob.size);
    const info = `原始: ${formatSize(source.file.size)} → 压缩后: ${formatSize(result.blob.size)} (节省 ${ratio}%)`;
    await copyToClipboard(info);
    onCopy();
  };

  const handleClear = () => {
    if (source?.url) URL.revokeObjectURL(source.url);
    if (result?.url) URL.revokeObjectURL(result.url);
    setSource(null);
    setResult(null);
  };

  const compressionRatio = source && result
    ? getCompressionRatio(source.file.size, result.blob.size)
    : 0;

  return (
    <div className="flex flex-col gap-4 p-4">
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
            <p className="text-sm font-medium">点击上传或拖拽图片到此处</p>
            <p className="text-xs text-muted-foreground mt-1">支持 JPEG、PNG、WebP、BMP</p>
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
              <CardTitle>压缩设置</CardTitle>
              <CardAction>
                <Button size="xs" variant="ghost" onClick={handleClear}>
                  <TrashIcon data-icon="inline-start" />
                  清除图片
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-6">
                <div className="flex-1 min-w-48 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>压缩质量</Label>
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
                <div className="flex gap-2">
                  <Button onClick={compress} disabled={isCompressing}>
                    <ImageIcon data-icon="inline-start" />
                    {isCompressing ? "压缩中..." : "压缩"}
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
                  原始图片
                  <Badge variant="secondary">{formatSize(source.file.size)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative rounded-lg overflow-hidden bg-muted/50 border">
                  <img
                    src={source.url}
                    alt="原始图片"
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
                  压缩结果
                  {result && (
                    <Badge variant={compressionRatio > 0 ? "default" : "destructive"}>
                      {compressionRatio > 0 ? `节省 ${compressionRatio}%` : `增大 ${Math.abs(compressionRatio)}%`}
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
                        保存
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
                        alt="压缩后"
                        className="w-full h-auto max-h-80 object-contain"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {result.width} × {result.height} · {formatSize(result.blob.size)} · {outputFormat.split("/")[1].toUpperCase()}
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                    点击"压缩"按钮查看结果
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