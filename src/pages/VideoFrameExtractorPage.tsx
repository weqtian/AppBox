import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  CameraIcon,
  DownloadIcon,
  UploadIcon,
  RotateCcwIcon,
  VideoIcon,
  ImageIcon,
  XIcon,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "@/i18n";
import { saveFile } from "@/lib/save-file";
import {
  toVideoSrc,
  getFileName,
  formatTime,
  OUTPUT_FORMATS,
  DEFAULT_FRAME_STEP,
  type FrameResult,
  type VideoMetadata,
} from "@/lib/video";

/** 解析 mm:ss.cs 或 mm:ss 格式为秒,失败返回 NaN */
function parseTimeToSeconds(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/);
  if (!match) return NaN;
  const [, m, s, frac] = match;
  const mins = parseInt(m, 10);
  const secs = parseInt(s, 10);
  // 把任意位小数归一化为厘秒
  let cs = 0;
  if (frac) {
    const padded = (frac + "00").slice(0, 3);
    cs = Math.floor(parseInt(padded, 10) / 10);
  }
  return mins * 60 + secs + cs / 100;
}

export default function VideoFrameExtractorPage() {
  const { t } = useTranslation();

  // === 状态 ===
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frameResult, setFrameResult] = useState<FrameResult | null>(null);
  const [outputFormat, setOutputFormat] = useState<"jpeg" | "png">("jpeg");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // 进度条拖动时,禁用 video.timeupdate 覆写 currentTime
  const [isScrubbing, setIsScrubbing] = useState(false);
  // 时间输入框独立状态
  const [timeInput, setTimeInput] = useState("00:00.00");

  // === Refs ===
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const successTimerRef = useRef<number | null>(null);

  // 当前 video 的 src(供 video 元素使用,useMemo 避免重复计算)
  const videoSrc = useMemo(() => (videoPath ? toVideoSrc(videoPath) : null), [videoPath]);

  // === 文件选择 ===
  const handleSelectVideo = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Video", extensions: ["mp4", "mov", "avi", "mkv", "webm", "m4v"] }],
      });
      if (!selected) return;

      const path = selected as string;
      // 释放旧 blob
      if (frameResult) URL.revokeObjectURL(frameResult.url);
      setFrameResult(null);
      setError(null);
      setMetadata(null);
      setCurrentTime(0);
      setTimeInput("00:00.00");
      setVideoPath(path);
    } catch (e) {
      setError(String(e));
    }
  }, [frameResult]);

  // === 元数据加载完成 ===
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video || !videoPath) return;
    // videoWidth/Height 可能在某些编码中短暂为 0,延迟读取
    const width = video.videoWidth || 0;
    const height = video.videoHeight || 0;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    setMetadata({
      filePath: videoPath,
      fileName: getFileName(videoPath),
      duration,
      width,
      height,
      format: outputFormat,
    });
  }, [videoPath, outputFormat]);

  // === 播放控制 ===
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => {/* 用户取消自动播放等 */});
    } else {
      video.pause();
    }
  }, []);

  // === Seek ===
  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video || !metadata || metadata.duration <= 0) return;
      const clamped = Math.max(0, Math.min(time, metadata.duration));
      // 某些浏览器在 paused 状态下不会触发 seeked,这里用 currentTime 即可
      video.currentTime = clamped;
      setCurrentTime(clamped);
      setTimeInput(formatTime(clamped));
    },
    [metadata]
  );

  // 等待 video 结束 seeking(若在 seek 中)
  const waitForSeeked = useCallback((video: HTMLVideoElement): Promise<void> => {
    if (!video.seeking) return Promise.resolve();
    return new Promise((resolve) => {
      const onDone = () => {
        video.removeEventListener("seeked", onDone);
        resolve();
      };
      video.addEventListener("seeked", onDone);
    });
  }, []);

  // === 帧步进 ===
  const handlePrevFrame = useCallback(() => {
    seekTo(currentTime - DEFAULT_FRAME_STEP);
  }, [seekTo, currentTime]);

  const handleNextFrame = useCallback(() => {
    seekTo(currentTime + DEFAULT_FRAME_STEP);
  }, [seekTo, currentTime]);

  // === 截取当前帧 ===
  const handleExtractFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !metadata) return;
    if (extracting) return;

    setExtracting(true);
    setError(null);

    try {
      // 暂停以稳定画面
      if (!video.paused) video.pause();

      // 等待当前 seeking 完成
      await waitForSeeked(video);

      // 兼容性:videoWidth 可能为 0(部分编码),回退到 metadata
      const w = video.videoWidth || metadata.width;
      const h = video.videoHeight || metadata.height;
      if (w === 0 || h === 0) {
        throw new Error(t("videoExtractor.videoNotReady"));
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error(t("videoExtractor.canvasError"));

      ctx.drawImage(video, 0, 0, w, h);

      const mime = outputFormat === "png" ? "image/png" : "image/jpeg";
      const quality = outputFormat === "jpeg" ? 0.95 : undefined;
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error(t("videoExtractor.extractFailed")))),
          mime,
          quality
        );
      });

      // 释放旧 url
      if (frameResult) URL.revokeObjectURL(frameResult.url);

      const url = URL.createObjectURL(blob);
      setFrameResult({
        url,
        width: w,
        height: h,
        format: outputFormat,
        blob,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExtracting(false);
    }
  }, [metadata, outputFormat, extracting, t, frameResult, waitForSeeked]);

  // === 保存图片 ===
  const handleSaveImage = useCallback(async () => {
    if (!frameResult || !metadata) return;
    if (saving) return;

    setSaving(true);
    setError(null);
    try {
      const ext = OUTPUT_FORMATS.find((f) => f.value === frameResult.format)?.ext ?? "jpg";
      const baseName = metadata.fileName.replace(/\.[^.]+$/, "") || "frame";
      const timeTag = formatTime(currentTime).replace(/[:.]/g, "-");
      const fileName = `${baseName}_${timeTag}.${ext}`;
      await saveFile(frameResult.blob, fileName);
      // 成功提示(内联,避免跨 useCallback 依赖):3 秒后自动消失
      // t() 不支持占位符插值,这里手动拼接
      const tmpl = t("videoExtractor.saveSuccess");
      const msg = tmpl.replace("{name}", fileName);
      setSuccess(msg);
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = window.setTimeout(() => {
        setSuccess(null);
        successTimerRef.current = null;
      }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [frameResult, metadata, currentTime, saving, t]);

  // === 清除 ===
  const handleClear = useCallback(() => {
    if (frameResult) URL.revokeObjectURL(frameResult.url);
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    setVideoPath(null);
    setMetadata(null);
    setCurrentTime(0);
    setTimeInput("00:00.00");
    setIsPlaying(false);
    setFrameResult(null);
    setError(null);
    setSuccess(null);
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, [frameResult]);

  // === 卸载时释放 blob ===
  useEffect(() => {
    return () => {
      if (frameResult) URL.revokeObjectURL(frameResult.url);
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === video timeupdate 同步 currentTime(被 scrub 抑制) ===
  const handleTimeUpdate = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      if (isScrubbing) return;
      const t = e.currentTarget.currentTime;
      setCurrentTime(t);
      setTimeInput(formatTime(t));
    },
    [isScrubbing]
  );

  // === Slider scrub 状态(按下/抬起) ===
  const handleScrubStart = useCallback(() => setIsScrubbing(true), []);
  const handleScrubEnd = useCallback(() => setIsScrubbing(false), []);

  // === 时间输入 ===
  const handleTimeInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeInput(e.target.value);
  }, []);

  const handleTimeInputCommit = useCallback(() => {
    const seconds = parseTimeToSeconds(timeInput);
    if (Number.isFinite(seconds)) {
      seekTo(seconds);
    } else {
      // 输入无效,恢复显示
      setTimeInput(formatTime(currentTime));
    }
  }, [timeInput, seekTo, currentTime]);

  const handleTimeInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleTimeInputCommit();
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        setTimeInput(formatTime(currentTime));
        e.currentTarget.blur();
      }
    },
    [handleTimeInputCommit, currentTime]
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* === 视频源卡片 === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VideoIcon className="size-4" />
            {videoPath ? metadata?.fileName ?? t("videoExtractor.video") : t("videoExtractor.selectVideo")}
          </CardTitle>
          {videoPath && (
            <CardAction>
              <Button size="xs" variant="ghost" onClick={handleClear}>
                <RotateCcwIcon data-icon="inline-start" />
                {t("videoExtractor.clear")}
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {!videoPath ? (
            <div
              onClick={handleSelectVideo}
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-muted-foreground/25 rounded-xl py-16 cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
            >
              <UploadIcon className="size-10 text-muted-foreground/50" />
              <div className="text-center">
                <p className="text-sm font-medium">{t("videoExtractor.uploadHint")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("videoExtractor.uploadSupported")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 视频播放器 */}
              <div className="relative bg-muted/40 rounded-lg overflow-hidden flex items-center justify-center min-h-[260px]">
                <video
                  ref={videoRef}
                  src={videoSrc ?? undefined}
                  className="max-h-[55vh] w-auto"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onError={() => setError(t("videoExtractor.videoLoadError"))}
                  playsInline
                  preload="metadata"
                />
              </div>

              {/* 文件信息 */}
              {metadata && metadata.duration > 0 && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{metadata.fileName}</span>
                  <span>·</span>
                  <span className="tabular-nums">{formatTime(metadata.duration)}</span>
                  {metadata.width > 0 && metadata.height > 0 && (
                    <>
                      <span>·</span>
                      <span className="tabular-nums">{metadata.width}×{metadata.height}</span>
                    </>
                  )}
                </div>
              )}

              {/* 进度条 / 时间控制 */}
              {metadata && metadata.duration > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={togglePlay}
                      title={isPlaying ? t("videoExtractor.pause") : t("videoExtractor.play")}
                    >
                      {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={handlePrevFrame}
                      title={t("videoExtractor.prevFrame")}
                    >
                      <SkipBackIcon />
                    </Button>
                    <Slider
                      value={[currentTime]}
                      onValueChange={([v]) => {
                        if (metadata) {
                          const clamped = Math.max(0, Math.min(v, metadata.duration));
                          setCurrentTime(clamped);
                          setTimeInput(formatTime(clamped));
                        }
                      }}
                      onPointerDown={handleScrubStart}
                      onPointerUp={handleScrubEnd}
                      onValueCommit={([v]) => {
                        handleScrubEnd();
                        seekTo(v);
                      }}
                      min={0}
                      max={metadata.duration}
                      step={0.01}
                      className="flex-1"
                    />
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={handleNextFrame}
                      title={t("videoExtractor.nextFrame")}
                    >
                      <SkipForwardIcon />
                    </Button>
                    <Input
                      value={timeInput}
                      onChange={handleTimeInputChange}
                      onBlur={handleTimeInputCommit}
                      onKeyDown={handleTimeInputKeyDown}
                      className="w-28 font-mono text-xs tabular-nums"
                      aria-label={t("videoExtractor.timeInput")}
                    />
                  </div>
                </div>
              )}

              {/* 截取按钮 */}
              <div className="flex justify-center pt-1">
                <Button
                  onClick={handleExtractFrame}
                  disabled={!metadata || extracting || metadata.duration === 0}
                >
                  <CameraIcon data-icon="inline-start" />
                  {extracting ? t("videoExtractor.extracting") : t("videoExtractor.extract")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === 截取结果预览 === */}
      {frameResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="size-4" />
              {t("videoExtractor.preview")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* 预览图 */}
              <div className="bg-muted/40 rounded-lg overflow-hidden flex items-center justify-center p-2 min-h-[200px]">
                <img
                  src={frameResult.url}
                  alt={t("videoExtractor.previewAlt")}
                  className="max-h-[55vh] max-w-full rounded"
                />
              </div>

              {/* 格式 / 尺寸 / 保存 */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">
                    {t("videoExtractor.format")}
                  </Label>
                  <Select
                    value={outputFormat}
                    onValueChange={(v) => setOutputFormat(v as "jpeg" | "png")}
                  >
                    <SelectTrigger className="h-7 w-20 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTPUT_FORMATS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                  <span>{t("videoExtractor.dimensions")}:</span>
                  <span>{frameResult.width}×{frameResult.height}</span>
                </div>

                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (frameResult) URL.revokeObjectURL(frameResult.url);
                      setFrameResult(null);
                    }}
                  >
                    <XIcon data-icon="inline-start" />
                    {t("videoExtractor.discard")}
                  </Button>
                  <Button size="sm" onClick={handleSaveImage} disabled={saving}>
                    <DownloadIcon data-icon="inline-start" />
                    {saving ? t("videoExtractor.saving") : t("videoExtractor.save")}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* === 状态提示(成功 / 错误) === */}
      {(success || error) && (
        <div
          role="status"
          aria-live="polite"
          className={
            error
              ? "text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2"
              : "text-sm text-green-700 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2"
          }
        >
          {error ?? success}
        </div>
      )}

      {/* 隐藏的 canvas,用于帧抓取 */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
