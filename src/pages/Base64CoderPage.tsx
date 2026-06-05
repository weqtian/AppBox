/**
 * Base64 编解码页面
 *
 * 提供 Base64 的实时编码与解码功能，支持：
 * - 实时编码：输入文本 → Base64 编码
 * - 实时解码：输入 Base64 → 原始文本
 * - 自动检测输入类型（文本 / Base64）
 * - UTF-8 多字节字符完整支持（中文、日文等）
 * - 一键复制编码/解码结果
 * - 无效 Base64 时显示错误提示
 *
 * 布局：顶部工具栏 + 输入区 + 编码/解码双栏结果 + 底部提示
 *
 * @module pages/Base64CoderPage
 */

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CopyIcon, XIcon, FileCodeIcon, ShieldCheckIcon, AlertTriangleIcon } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { useTranslation } from "@/i18n";

// ============================================================
// 编解码逻辑
// ============================================================

/** 检测字符串是否可能是 Base64 编码 */
function isLikelyBase64(str: string): boolean {
  const trimmed = str.trim();
  if (!trimmed) return false;
  // Base64 字符集：A-Z a-z 0-9 + / =（填充）
  return /^[A-Za-z0-9+/]*={0,2}$/.test(trimmed) && trimmed.length % 4 === 0;
}

/** UTF-8 安全的 Base64 编码 */
function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/** UTF-8 安全的 Base64 解码 */
function decodeBase64(base64: string): { ok: true; text: string } | { ok: false; error: string } {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { ok: true, text: new TextDecoder().decode(bytes) };
  } catch {
    return { ok: false, error: "Invalid Base64" };
  }
}

// ============================================================
// 复制按钮组件
// ============================================================

function CopyButton({ text, label }: { text: string; label: string }) {
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
        <span className="text-xs text-emerald-600">{label}</span>
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </Button>
  );
}

// ============================================================
// 页面主体
// ============================================================

export default function Base64CoderPage() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");

  // 实时计算编码和解码结果
  const { encoded, decoded, decodeError, isBase64Input } = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      return { encoded: "", decoded: "", decodeError: false, isBase64Input: false };
    }

    // 编码：任何输入都可以编码为 Base64
    const encoded = encodeBase64(trimmed);

    // 解码：尝试解码
    const base64Detected = isLikelyBase64(trimmed);
    const result = decodeBase64(trimmed);

    return {
      encoded,
      decoded: result.ok ? result.text : "",
      decodeError: !result.ok && base64Detected,
      isBase64Input: base64Detected,
    };
  }, [input]);

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <div className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <FileCodeIcon className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">{t("base64.title")}</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* 输入类型检测提示 */}
            {input.trim() && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheckIcon className="size-3" />
                {isBase64Input ? t("base64.detectedBase64") : t("base64.detectedText")}
              </span>
            )}
            <Button size="xs" variant="ghost" onClick={() => setInput("")}>
              <XIcon className="size-3" />
              {t("base64.clear")}
            </Button>
          </div>
        </div>
      </div>

      {/* 输入区 */}
      <div className="border-b">
        <div className="px-4 py-2.5">
          <textarea
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus-within:ring-1 focus-within:ring-ring min-h-24"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("base64.placeholder")}
            spellCheck={false}
          />
        </div>
      </div>

      {/* 结果区：编码 + 解码 双栏 */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {input.trim() ? (
          <div className="grid grid-cols-2 gap-3 h-full">
            {/* 编码结果 */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">{t("base64.encodeResult")}</span>
                <CopyButton text={encoded} label={t("base64.copied")} />
              </div>
              <div className="flex-1 min-h-0 rounded-lg border bg-muted/30 p-3 overflow-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap break-all">{encoded}</pre>
              </div>
            </div>

            {/* 解码结果 */}
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">{t("base64.decodeResult")}</span>
                {decoded && <CopyButton text={decoded} label={t("base64.copied")} />}
              </div>
              <div className="flex-1 min-h-0 rounded-lg border bg-muted/30 p-3 overflow-auto">
                {decodeError ? (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangleIcon className="size-3.5 shrink-0" />
                    {t("base64.invalidBase64")}
                  </div>
                ) : (
                  <pre className="text-sm font-mono whitespace-pre-wrap break-all">{decoded}</pre>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <FileCodeIcon className="size-8 opacity-30" />
            <p className="text-xs">{t("base64.placeholder")}</p>
          </div>
        )}
      </div>

      {/* 底部提示条 */}
      <div className="border-t px-4 py-1.5 text-xs text-muted-foreground">
        {t("base64.localOnly")}
      </div>
    </div>
  );
}
