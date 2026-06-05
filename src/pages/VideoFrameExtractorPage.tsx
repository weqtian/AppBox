/**
 * 视频截帧页面
 *
 * 提供视频文件的逐帧定位与截图功能，支持：
 * - 选择本地视频文件（MP4/MOV/AVI/MKV/WebM）
 * - 视频播放/暂停/逐帧步进
 * - 精确时间轴拖拽 + 手动时间输入
 * - 截取当前帧为 JPEG/PNG 图片
 * - 截帧结果预览、保存
 *
 * 布局采用左右分栏：左侧视频播放器+控制条，右侧截帧结果预览+操作。
 *
 * @module pages/VideoFrameExtractorPage
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
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

/** 解析 mm:ss.cs 或 mm:ss 格式为秒，失败返回 NaN */
function parseTimeToSeconds(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/);
  if (!match) return NaN;
  const [, m, s, frac] = match;
  const mins = parseInt(m, 10);
  const secs = parseInt(s, 10);
  let cs = 0;
  if (frac) {
    const padded = (frac + "00").slice(0, 3);
    cs = Math.floor(parseInt(padded, 10) / 10);
  }
  return mins * 60 + secs + cs / 100;
}

// ============================================================
// 页面组件
// ============================================================

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
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [timeInput, setTimeInput] = useState("00:00.00");

  // === Refs ===
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const successTimerRef = useRef<number | null>(null);

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
      void video.play().catch(() => { /* 用户取消自动播放 */ });
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
      video.currentTime = clamped;
      setCurrentTime(clamped);
      setTimeInput(formatTime(clamped));
    },
    [metadata]
  );

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
      if (!video.paused) video.pause();
      await waitForSeeked(video);

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

  // === video timeupdate 同步 ===
  const handleTimeUpdate = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      if (isScrubbing) return;
      const tv = e.currentTarget.currentTime;
      setCurrentTime(tv);
      setTimeInput(formatTime(tv));
    },
    [isScrubbing]
  );

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
    <div className="flex flex-col h-full">
      {/* ============================================================ */}
      {/* 上传区域（无视频时） */}
      {/* ============================================================ */}
      {!videoPath ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div
            onClick={handleSelectVideo}
            className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-muted-foreground/25 rounded-xl p-16 w-full max-w-lg cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="rounded-full bg-primary/10 p-4">
              <VideoIcon className="size-10 text-primary/60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{t("videoExtractor.uploadHint")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("videoExtractor.uploadSupported")}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ============================================================ */}
          {/* 顶部工具栏 */}
          {/* ============================================================ */}
          <div className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <VideoIcon className="size-4 text-primary shrink-0" />
                <span className="text-sm font-medium truncate">
                  {metadata?.fileName ?? t("videoExtractor.video")}
                </span>
                {metadata && metadata.duration > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {formatTime(metadata.duration)}
                    {metadata.width > 0 && metadata.height > 0 && (
                      <> · {metadata.width}×{metadata.height}</>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="xs" variant="ghost" onClick={handleClear}>
                  <RotateCcwIcon className="size-3.5" />
                  {t("videoExtractor.clear")}
                </Button>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 主内容区：左右分栏 */}
          {/* ============================================================ */}
          <div className="flex-1 flex min-h-0">
            {/* 左栏：视频播放器 + 控制条 */}
            <div className={`${frameResult ? "w-[60%] border-e" : "flex-1"} flex flex-col min-h-0`}>
              {/* 视频播放器 */}
              <div className="flex-1 bg-muted/30 flex items-center justify-center min-h-0 overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoSrc ?? undefined}
                  className="max-h-full max-w-full w-auto h-auto"
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

              {/* 播放控制条 */}
              {metadata && metadata.duration > 0 && (
                <div className="border-t bg-background">
                  <div className="flex items-center gap-2 px-3 py-2">
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
                      className="w-28 h-7 font-mono text-xs tabular-nums"
                      aria-label={t("videoExtractor.timeInput")}
                    />
                    <Button
                      size="sm"
                      onClick={handleExtractFrame}
                      disabled={extracting || metadata.duration === 0}
                    >
                      {extracting ? (
                        <CameraIcon className="size-3.5 animate-pulse" />
                      ) : (
                        <CameraIcon className="size-3.5" />
                      )}
                      {extracting ? t("videoExtractor.extracting") : t("videoExtractor.extract")}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 右栏：截帧结果预览 */}
            {frameResult && (
              <div className="w-[40%] flex flex-col min-h-0">
                {/* 预览标题 */}
                <div className="flex items-center justify-between px-4 py-2 border-b">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="size-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("videoExtractor.preview")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => {
                        URL.revokeObjectURL(frameResult.url);
                        setFrameResult(null);
                      }}
                      title={t("videoExtractor.discard")}
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* 预览图 */}
                <div className="flex-1 bg-muted/30 flex items-center justify-center p-3 min-h-0 overflow-hidden">
                  <img
                    src={frameResult.url}
                    alt={t("videoExtractor.previewAlt")}
                    className="max-h-full max-w-full object-contain rounded"
                  />
                </div>

                {/* 底部操作栏 */}
                <div className="border-t px-4 py-2.5 space-y-2">
                  <div className="flex items-center gap-3">
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
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleSaveImage}
                    disabled={saving}
                  >
                    <DownloadIcon className="size-3.5" />
                    {saving ? t("videoExtractor.saving") : t("videoExtractor.save")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 状态提示条 */}
          {(success || error) && (
            <div
              role="status"
              aria-live="polite"
              className={
                error
                  ? "text-xs text-destructive bg-destructive/10 border-t border-destructive/20 px-4 py-2"
                  : "text-xs text-green-700 dark:text-green-400 bg-green-500/10 border-t border-green-500/20 px-4 py-2"
              }
            >
              {error ?? success}
            </div>
          )}
        </>
      )}

      {/* 隐藏的 canvas，用于帧抓取 */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
