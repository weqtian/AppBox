/**
 * JWT 解析页面
 *
 * 提供 JWT Token 的实时解析功能，支持：
 * - 自动剥离 Bearer/Basic/Token/JWT 等前缀
 * - Header/Payload/Signature 三段颜色高亮显示
 * - 时间戳字段（exp/iat/nbf/auth_time）自动格式化
 * - 相对时间显示（支持国际化）
 * - 一键复制各段 JSON 内容
 *
 * 布局：顶部提示栏 + 左右分栏（左：输入 / 右：解析结果）
 *
 * @module pages/JwtParserPage
 */

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CopyIcon, XIcon, ShieldCheckIcon, AlertTriangleIcon, KeyRoundIcon } from "lucide-react";
import { decodeJwt, formatTimestamp, isTimestampKey, type JwtResult, type RelativeTimeTexts } from "@/lib/jwt";
import { copyToClipboard } from "@/lib/clipboard";
import { useTranslation, type TranslationKey } from "@/i18n";

// ============================================================
// 主题配色
// ============================================================

/** 三段 JWT 的可视化主题色 */
type Theme = "red" | "blue" | "slate";

/** 各主题的 Tailwind 类名映射 */
const THEME: Record<Theme, { border: string; headerBg: string; label: string; body: string }> = {
  red: {
    border: "border-red-200 dark:border-red-900/60",
    headerBg: "bg-red-50/70 dark:bg-red-950/30",
    label: "text-red-600 dark:text-red-400",
    body: "bg-red-50/30 dark:bg-red-950/10",
  },
  blue: {
    border: "border-blue-200 dark:border-blue-900/60",
    headerBg: "bg-blue-50/70 dark:bg-blue-950/30",
    label: "text-blue-600 dark:text-blue-400",
    body: "bg-blue-50/30 dark:bg-blue-950/10",
  },
  slate: {
    border: "border-border",
    headerBg: "bg-muted/50",
    label: "text-muted-foreground",
    body: "bg-muted/20",
  },
};

// ============================================================
// 子组件
// ============================================================

/** JWT 分段卡片 */
function SectionCard({
  theme, label, hint, copyText, copyTitle, onCopy, children,
}: {
  theme: Theme;
  label: string;
  hint?: string;
  copyText: string;
  copyTitle: string;
  onCopy: (text: string) => void;
  children: React.ReactNode;
}) {
  const c = THEME[theme];
  return (
    <div className={`rounded-lg border ${c.border} overflow-hidden`}>
      <div className={`flex items-center justify-between gap-2 px-3 py-2 ${c.headerBg}`}>
        <div className="min-w-0 flex items-baseline gap-2">
          <span className={`text-xs font-bold tracking-wider uppercase ${c.label}`}>{label}</span>
          {hint && <span className="text-[11px] text-muted-foreground truncate">{hint}</span>}
        </div>
        <Button size="icon-xs" variant="ghost" onClick={() => onCopy(copyText)} title={copyTitle} disabled={!copyText}>
          <CopyIcon className="size-3" />
        </Button>
      </div>
      <div className={`p-3 ${c.body}`}>{children}</div>
    </div>
  );
}

/** JSON 数据视图（带语法高亮和时间戳格式化） */
function JsonView({
  data, theme, relativeTexts, t,
}: {
  data: Record<string, unknown>;
  theme: Theme;
  relativeTexts: RelativeTimeTexts;
  t: (key: TranslationKey) => string;
}) {
  const json = JSON.stringify(data, null, 2);
  const timestampFields = Object.entries(data).filter(([key]) => isTimestampKey(key));

  return (
    <>
      <pre className="text-sm font-mono whitespace-pre-wrap break-all rounded-md bg-background/60 dark:bg-background/40 p-3 leading-relaxed">
        {syntaxHighlight(json, theme)}
      </pre>
      {timestampFields.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t pt-3">
          {timestampFields.map(([key, value]) => {
            const ts = formatTimestamp(value, relativeTexts);
            const keyLabel = (() => {
              switch (key) {
                case "exp": return t("jwt.exp");
                case "iat": return t("jwt.iat");
                case "nbf": return t("jwt.nbf");
                case "auth_time": return t("jwt.authTime");
                default: return key;
              }
            })();
            return (
              <div key={key} className="flex items-start gap-2 text-xs">
                <span className="font-mono font-semibold text-foreground/70 shrink-0">{keyLabel}:</span>
                <span className="text-muted-foreground">
                  {ts ? (
                    <>
                      <span className="text-foreground">{ts.formatted}</span>
                      <span className="ms-2 text-xs text-muted-foreground/80">({ts.relative})</span>
                    </>
                  ) : (
                    String(value)
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ============================================================
// JSON 语法高亮
// ============================================================

function syntaxHighlight(json: string, theme: Theme): React.ReactNode[] {
  const lines = json.split("\n");
  const keyColor =
    theme === "red" ? "text-red-600 dark:text-red-400"
      : theme === "blue" ? "text-blue-600 dark:text-blue-400"
      : "text-foreground";
  const stringColor = theme === "red" ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400";
  const numberColor = "text-purple-600 dark:text-purple-400";
  const boolNullColor = "text-orange-600 dark:text-orange-400";

  return lines.map((line, i) => {
    const keyMatch = line.match(/^(\s*)"([^"]+)"(\s*:\s*)/);
    if (keyMatch) {
      const [, indent, key, colon] = keyMatch;
      const rest = line.slice(keyMatch[0].length);
      const valueNode = colorizeValue(rest, stringColor, numberColor, boolNullColor);
      return (
        <div key={i}>
          {indent}&quot;<span className={keyColor}>{key}</span>&quot;{colon}{valueNode}
        </div>
      );
    }
    return <div key={i}>{line}</div>;
  });
}

function colorizeValue(value: string, stringColor: string, numberColor: string, boolNullColor: string): React.ReactNode {
  const trimmed = value.replace(/,\s*$/, "");
  const comma = value.endsWith(",") ? "," : "";

  if (trimmed.startsWith('"')) return <span className={stringColor}>{trimmed}</span>;
  if (trimmed === "true" || trimmed === "false") return <span className={boolNullColor}>{trimmed}{comma}</span>;
  if (trimmed === "null") return <span className={boolNullColor}>{trimmed}{comma}</span>;
  if (!isNaN(Number(trimmed)) && trimmed !== "") return <span className={numberColor}>{trimmed}{comma}</span>;
  return <>{value}</>;
}

// ============================================================
// 页面主体
// ============================================================

export default function JwtParserPage() {
  const { t } = useTranslation();
  const [token, setToken] = useState("");

  /** 构建国际化的相对时间文本 */
  const relativeTexts = useMemo(() => ({
    upcoming: t("jwt.relUpcoming"),
    justPast: t("jwt.relJustPast"),
    minutesLater: t("jwt.relMinutesLater"),
    minutesAgo: t("jwt.relMinutesAgo"),
    hoursLater: t("jwt.relHoursLater"),
    hoursAgo: t("jwt.relHoursAgo"),
    daysLater: t("jwt.relDaysLater"),
    daysAgo: t("jwt.relDaysAgo"),
  }), [t]);

  /** 解码 JWT */
  const result: JwtResult = useMemo(
    () => decodeJwt(token, t("jwt.formatError"), t("jwt.parseErrorPrefix")),
    [token, t]
  );

  const handleCopy = useCallback(async (text: string) => {
    if (!text) return;
    await copyToClipboard(text);
  }, []);

  const handleClear = useCallback(() => setToken(""), []);

  return (
    <div className="flex flex-col h-full">
      {/* ============================================================ */}
      {/* 顶部栏 */}
      {/* ============================================================ */}
      <div className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-primary shrink-0" />
            <span className="text-sm font-semibold">{t("jwt.tokenInput")}</span>
            <ShieldCheckIcon className="size-3 text-emerald-500" />
            <span className="text-[11px] text-muted-foreground">{t("jwt.localOnly")}</span>
          </div>
          {token && (
            <Button size="xs" variant="ghost" onClick={handleClear}>
              <XIcon className="size-3" />
              {t("jwt.clear")}
            </Button>
          )}
        </div>
        {/* 前缀剥离提示 */}
        {result.strippedPrefix && (
          <div className="flex items-center gap-2 px-4 pb-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangleIcon className="size-3 shrink-0" />
            <span>{t("jwt.strippedPrefix")}&nbsp;<code className="font-mono font-semibold bg-amber-100 dark:bg-amber-900/40 px-1 rounded">{result.strippedPrefix}</code></span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 主工作区：左右分栏 */}
      {/* ============================================================ */}
      <div className="flex flex-1 min-h-0">
        {/* 左栏 - 输入区 */}
        <div className="w-[42%] flex flex-col min-h-0 border-e">
          <textarea
            className="flex-1 w-full resize-none px-4 py-3 text-sm font-mono placeholder:text-muted-foreground/40 focus-visible:outline-none bg-transparent"
            placeholder={t("jwt.placeholder")}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* 右栏 - 输出区 */}
        <div className="w-[58%] flex flex-col min-h-0">
          {/* 结果标题 */}
          <div className="px-4 py-2 border-b">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("jwt.result")}
            </span>
          </div>

          {/* 结果内容 */}
          <div className="flex-1 min-h-0">
            {!token.trim() ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground/40">
                {t("jwt.emptyHint")}
              </div>
            ) : !result.isValid ? (
              <div className="flex items-center justify-center h-full">
                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400 max-w-md text-center">
                  <p className="font-medium mb-1">{t("jwt.invalid")}</p>
                  {result.error && <p className="text-xs opacity-80">{result.error}</p>}
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-3 p-4 pe-6">
                  {result.header && (
                    <SectionCard
                      theme="red"
                      label={t("jwt.header")}
                      hint={t("jwt.headerHint")}
                      copyText={JSON.stringify(result.header, null, 2)}
                      copyTitle={t("jwt.copyHeader")}
                      onCopy={handleCopy}
                    >
                      <JsonView data={result.header} theme="red" relativeTexts={relativeTexts} t={t} />
                    </SectionCard>
                  )}
                  {result.payload && (
                    <SectionCard
                      theme="blue"
                      label={t("jwt.payload")}
                      hint={t("jwt.payloadHint")}
                      copyText={JSON.stringify(result.payload, null, 2)}
                      copyTitle={t("jwt.copyPayload")}
                      onCopy={handleCopy}
                    >
                      <JsonView data={result.payload} theme="blue" relativeTexts={relativeTexts} t={t} />
                    </SectionCard>
                  )}
                  {result.signature && (
                    <SectionCard
                      theme="slate"
                      label={t("jwt.signature")}
                      hint={t("jwt.signatureHint")}
                      copyText={result.signature}
                      copyTitle={t("jwt.copySignature")}
                      onCopy={handleCopy}
                    >
                      <pre className="text-sm font-mono whitespace-pre-wrap break-all rounded-md bg-background/60 dark:bg-background/40 p-3 leading-relaxed text-muted-foreground">
                        {result.signature}
                      </pre>
                    </SectionCard>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
