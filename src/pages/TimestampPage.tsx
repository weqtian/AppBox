/**
 * 时间戳转换页面
 *
 * 提供 Unix 时间戳与可读日期之间的双向转换，支持：
 * - 实时显示当前时间戳（秒 / 毫秒）
 * - 时间戳 → 日期：输入 Unix 时间戳，显示本地时间、UTC 时间、相对时间
 * - 日期 → 时间戳：选择日期时间，生成对应的秒级/毫秒级时间戳
 * - 相对时间显示（支持国际化）
 * - 一键复制时间戳
 * - 支持秒级和毫秒级时间戳自动识别
 *
 * 布局：顶部当前时间戳 + 左右分栏（时间戳→日期 / 日期→时间戳）
 *
 * @module pages/TimestampPage
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CopyIcon, RefreshCwIcon, ClockIcon, ArrowRightLeftIcon, CalendarIcon } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { useTranslation, type TranslationKey } from "@/i18n";

// ============================================================
// 时间工具函数
// ============================================================

/** 计算相对时间 */
function getRelativeTime(target: number, now: number, t: (key: TranslationKey) => string): string {
  const diffMs = target - now;
  const absDiff = Math.abs(diffMs);
  const isFuture = diffMs > 0;

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) return t("timestamp.justNow");
  if (seconds < 60) return isFuture
    ? t("timestamp.secondsLater").replace("{n}", String(seconds))
    : t("timestamp.secondsAgo").replace("{n}", String(seconds));
  if (minutes < 60) return isFuture
    ? t("timestamp.minutesLater").replace("{n}", String(minutes))
    : t("timestamp.minutesAgo").replace("{n}", String(minutes));
  if (hours < 24) return isFuture
    ? t("timestamp.hoursLater").replace("{n}", String(hours))
    : t("timestamp.hoursAgo").replace("{n}", String(hours));
  return isFuture
    ? t("timestamp.daysLater").replace("{n}", String(days))
    : t("timestamp.daysAgo").replace("{n}", String(days));
}

/** 格式化为本地时间字符串 */
function formatLocal(date: Date): string {
  return date.toLocaleString(undefined, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
}

/** 格式化为 ISO 8601 */
function formatISO(date: Date): string {
  return date.toISOString();
}

/** 获取 datetime-local 输入框的值 */
function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 自动识别时间戳是秒级还是毫秒级 */
function normalizeTimestamp(value: string): number | null {
  const num = Number(value.trim());
  if (isNaN(num) || num === 0) return null;
  // 秒级时间戳：< 10^11（2286 年之前都是秒级）
  // 毫秒级时间戳：>= 10^11
  return num < 1e11 ? num * 1000 : num;
}

// ============================================================
// 复制按钮组件
// ============================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!text) return;
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <Button size="icon-xs" variant="ghost" onClick={handleCopy}>
      {copied ? (
        <span className="text-xs text-emerald-600">✓</span>
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </Button>
  );
}

// ============================================================
// 页面主体
// ============================================================

export default function TimestampPage() {
  const { t } = useTranslation();

  // 当前时间戳（自动更新）
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 时间戳 → 日期
  const [tsInput, setTsInput] = useState("");
  const tsResult = useMemo(() => {
    if (!tsInput.trim()) return null;
    const ms = normalizeTimestamp(tsInput);
    if (ms === null) return "invalid";
    const date = new Date(ms);
    if (isNaN(date.getTime())) return "invalid";
    return date;
  }, [tsInput]);

  // 日期 → 时间戳
  const [dateInput, setDateInput] = useState(() => toDatetimeLocal(new Date()));
  const dateResult = useMemo(() => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return null;
    return {
      seconds: Math.floor(date.getTime() / 1000),
      milliseconds: date.getTime(),
    };
  }, [dateInput]);

  /** 设置日期为当前时间 */
  const setToNow = useCallback(() => {
    setDateInput(toDatetimeLocal(new Date()));
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* 顶部：当前时间戳 */}
      <div className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ClockIcon className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">{t("timestamp.title")}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("timestamp.currentTimestamp")}</span>
              <code className="text-sm font-mono font-medium tabular-nums">
                {Math.floor(now / 1000)}
              </code>
              <CopyButton text={String(Math.floor(now / 1000))} />
            </div>
            <Separator orientation="vertical" className="h-4" />
            <code className="text-xs font-mono text-muted-foreground tabular-nums">
              {now}
              <span className="text-muted-foreground/60 ms">{t("timestamp.milliseconds")}</span>
            </code>
          </div>
        </div>
      </div>

      {/* 主内容区：左右分栏 */}
      <div className="flex flex-1 min-h-0">
        {/* 左侧：时间戳 → 日期 */}
        <div className="w-1/2 flex flex-col min-h-0 border-e">
          <div className="px-4 py-2 border-b">
            <div className="flex items-center gap-2">
              <ArrowRightLeftIcon className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{t("timestamp.timestampToDate")}</span>
            </div>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-auto">
            {/* 时间戳输入 */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {t("timestamp.inputTimestamp")}
              </label>
              <input
                type="text"
                className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm font-mono tabular-nums outline-none focus-within:ring-1 focus-within:ring-ring"
                value={tsInput}
                onChange={(e) => setTsInput(e.target.value)}
                placeholder={t("timestamp.timestampPlaceholder")}
                spellCheck={false}
              />
            </div>

            {/* 转换结果 */}
            {tsResult && tsResult !== "invalid" && (
              <div className="space-y-2">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
                  {/* 本地时间 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground mb-0.5">{t("timestamp.localTime")}</p>
                      <p className="text-sm font-mono">{formatLocal(tsResult)}</p>
                    </div>
                    <CopyButton text={formatLocal(tsResult)} />
                  </div>

                  <Separator />

                  {/* UTC 时间 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground mb-0.5">{t("timestamp.utcTime")}</p>
                      <p className="text-sm font-mono">{formatISO(tsResult)}</p>
                    </div>
                    <CopyButton text={formatISO(tsResult)} />
                  </div>

                  <Separator />

                  {/* 相对时间 */}
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">{t("timestamp.relativeTime")}</p>
                    <p className="text-sm">{getRelativeTime(tsResult.getTime(), now, t)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 错误状态 */}
            {tsResult === "invalid" && (
              <div className="rounded-lg border border-red-200 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {t("timestamp.invalidTimestamp")}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：日期 → 时间戳 */}
        <div className="w-1/2 flex flex-col min-h-0">
          <div className="px-4 py-2 border-b">
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{t("timestamp.dateToTimestamp")}</span>
            </div>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-auto">
            {/* 日期时间输入 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">
                  {t("timestamp.inputDate")}
                </label>
                <Button size="xs" variant="ghost" onClick={setToNow}>
                  <RefreshCwIcon className="size-3" />
                  {t("timestamp.refresh")}
                </Button>
              </div>
              <input
                type="datetime-local"
                className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm font-mono outline-none focus-within:ring-1 focus-within:ring-ring"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                step="1"
              />
            </div>

            {/* 转换结果 */}
            {dateResult && (
              <div className="space-y-2">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
                  {/* 秒级时间戳 */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-0.5">{t("timestamp.seconds")}</p>
                      <p className="text-sm font-mono font-medium tabular-nums">{dateResult.seconds}</p>
                    </div>
                    <CopyButton text={String(dateResult.seconds)} />
                  </div>

                  <Separator />

                  {/* 毫秒级时间戳 */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-0.5">{t("timestamp.milliseconds")}</p>
                      <p className="text-sm font-mono font-medium tabular-nums">{dateResult.milliseconds}</p>
                    </div>
                    <CopyButton text={String(dateResult.milliseconds)} />
                  </div>

                  <Separator />

                  {/* ISO 格式 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground mb-0.5">{t("timestamp.isoFormat")}</p>
                      <p className="text-sm font-mono">{formatISO(new Date(dateResult.milliseconds))}</p>
                    </div>
                    <CopyButton text={formatISO(new Date(dateResult.milliseconds))} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部提示条 */}
      <div className="border-t px-4 py-1.5 text-xs text-muted-foreground">
        {t("timestamp.localOnly")}
      </div>
    </div>
  );
}
