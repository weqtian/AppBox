/**
 * URL 编解码页面
 *
 * 提供 URL 编码/解码功能，支持：
 * - 实时编码（encodeURIComponent）
 * - 实时解码（decodeURIComponent）
 * - 逐层深层解码（最多 10 层）
 * - 自动检测 URL 或已编码内容
 * - 一键复制结果
 *
 * 布局：顶部输入栏 + 下方结果区（编码/解码并排，深层解码条件显示）
 *
 * @module pages/URLCoderPage
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CopyIcon, RotateCcwIcon, LinkIcon, InfoIcon, ArrowDownIcon } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { useTranslation } from "@/i18n";

/** URL 正则 */
const URL_RE = /^(https?:\/\/|ftp:\/\/|www\.)/i;
/** 已编码内容正则 */
const ENCODED_RE = /%[0-9A-Fa-f]{2}/;

export default function URLCoderPage() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");

  const trimmed = input.trim();
  const looksLikeUrl = trimmed.length > 0 && URL_RE.test(trimmed);
  const looksEncoded = trimmed.length > 0 && ENCODED_RE.test(trimmed);

  // 编码结果
  const encoded = input ? encodeURIComponent(input) : "";

  // 解码结果
  let decoded = "";
  try {
    decoded = input ? decodeURIComponent(input) : "";
  } catch {
    decoded = t("urlCoder.invalidEncodedString");
  }

  // 逐层解码：反复尝试直到无法继续或达到 10 层
  const deepDecoded = (() => {
    if (!input) return "";
    let current = input;
    let last = "";
    let rounds = 0;
    while (current !== last && rounds < 10) {
      last = current;
      try {
        current = decodeURIComponent(current);
        rounds++;
      } catch {
        break;
      }
    }
    return current;
  })();

  // 深层解码是否与普通解码不同
  const hasDeepDecode = deepDecoded !== decoded && deepDecoded !== input && !!input;

  const handleCopy = useCallback(async (text: string) => {
    if (!text) return;
    await copyToClipboard(text);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* ============================================================ */}
      {/* 顶部：输入栏 */}
      {/* ============================================================ */}
      <div className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <LinkIcon className="size-4 text-primary shrink-0" />
            <span className="text-sm font-semibold">{t("urlCoder.input")}</span>
          </div>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setInput("")}
            disabled={!input}
          >
            <RotateCcwIcon className="size-3.5" />
            {t("urlCoder.clear")}
          </Button>
        </div>
        <div className="px-4 pb-3">
          <textarea
            placeholder={t("urlCoder.placeholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors min-h-20"
          />
          {/* 检测提示 */}
          {(looksLikeUrl || looksEncoded) && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              {looksLikeUrl ? (
                <>
                  <LinkIcon className="size-3 text-blue-500" />
                  <span>{t("urlCoder.detectedUrl")}</span>
                </>
              ) : (
                <>
                  <InfoIcon className="size-3 text-amber-500" />
                  <span>{t("urlCoder.detectedEncoded")}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 结果区 */}
      {/* ============================================================ */}
      <div className="flex-1 overflow-auto">
        {!input.trim() ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50">
            <LinkIcon className="size-8 mb-2" />
            <p className="text-sm">{t("urlCoder.placeholder")}</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* 编码 / 解码 并排 */}
            <div className="grid grid-cols-2 gap-3">
              {/* 编码结果 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("urlCoder.encodeResult")}
                  </span>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => handleCopy(encoded)}
                    disabled={!encoded}
                  >
                    <CopyIcon className="size-3" />
                  </Button>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 min-h-16">
                  <pre className="text-sm font-mono whitespace-pre-wrap break-all text-foreground/80">
                    {encoded || t("urlCoder.encodePlaceholder")}
                  </pre>
                </div>
              </div>

              {/* 解码结果 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("urlCoder.decodeResult")}
                  </span>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => handleCopy(decoded)}
                    disabled={!decoded || decoded === t("urlCoder.invalidEncodedString")}
                  >
                    <CopyIcon className="size-3" />
                  </Button>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 min-h-16">
                  <pre className={`text-sm font-mono whitespace-pre-wrap break-all ${decoded === t("urlCoder.invalidEncodedString") ? "text-destructive" : "text-foreground/80"}`}>
                    {decoded || t("urlCoder.decodePlaceholder")}
                  </pre>
                </div>
              </div>
            </div>

            {/* 逐层解码（条件显示） */}
            {hasDeepDecode && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ArrowDownIcon className="size-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {t("urlCoder.deepDecodeResult")}
                    </span>
                  </div>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => handleCopy(deepDecoded)}
                  >
                    <CopyIcon className="size-3" />
                  </Button>
                </div>
                <div className="rounded-lg border bg-primary/5 border-primary/20 p-3">
                  <pre className="text-sm font-mono whitespace-pre-wrap break-all text-foreground/80">
                    {deepDecoded}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
