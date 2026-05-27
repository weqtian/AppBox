import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CopyIcon, XIcon, ShieldCheckIcon, AlertTriangleIcon } from "lucide-react";
import { decodeJwt, formatTimestamp, isTimestampKey, type JwtResult } from "@/lib/jwt";
import { copyToClipboard } from "@/lib/clipboard";
import { useTranslation, type TranslationKey } from "@/i18n";

type Theme = "red" | "blue" | "slate";

const THEME: Record<
  Theme,
  {
    border: string;
    headerBg: string;
    label: string;
    body: string;
  }
> = {
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

function SectionCard({
  theme,
  label,
  hint,
  copyText,
  copyTitle,
  onCopy,
  children,
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
          <span className={`text-xs font-bold tracking-wider uppercase ${c.label}`}>
            {label}
          </span>
          {hint && <span className="text-[11px] text-muted-foreground truncate">{hint}</span>}
        </div>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => onCopy(copyText)}
          title={copyTitle}
          disabled={!copyText}
        >
          <CopyIcon />
        </Button>
      </div>
      <div className={`p-3 ${c.body}`}>{children}</div>
    </div>
  );
}

function JsonView({
  data,
  theme,
  t,
}: {
  data: Record<string, unknown>;
  theme: Theme;
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
            const ts = formatTimestamp(value);
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

function syntaxHighlight(json: string, theme: Theme): React.ReactNode[] {
  const lines = json.split("\n");
  const keyColor =
    theme === "red"
      ? "text-red-600 dark:text-red-400"
      : theme === "blue"
        ? "text-blue-600 dark:text-blue-400"
        : "text-foreground";
  const stringColor =
    theme === "red"
      ? "text-amber-700 dark:text-amber-400"
      : "text-emerald-700 dark:text-emerald-400";
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

function colorizeValue(
  value: string,
  stringColor: string,
  numberColor: string,
  boolNullColor: string
): React.ReactNode {
  const trimmed = value.replace(/,\s*$/, "");
  const comma = value.endsWith(",") ? "," : "";

  if (trimmed.startsWith('"')) {
    return <span className={stringColor}>{trimmed}</span>;
  }
  if (trimmed === "true" || trimmed === "false") {
    return <span className={boolNullColor}>{trimmed}{comma}</span>;
  }
  if (trimmed === "null") {
    return <span className={boolNullColor}>{trimmed}{comma}</span>;
  }
  if (!isNaN(Number(trimmed)) && trimmed !== "") {
    return <span className={numberColor}>{trimmed}{comma}</span>;
  }
  return <>{value}</>;
}

export default function JwtParserPage() {
  const { t } = useTranslation();
  const [token, setToken] = useState("");

  const result: JwtResult = useMemo(() => decodeJwt(token), [token]);

  const handleCopy = async (text: string) => {
    if (!text) return;
    await copyToClipboard(text);
  };

  const handleClear = () => setToken("");

  return (
    <div className="flex flex-col h-full">
      {/* 顶部安全提示 */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 text-xs text-muted-foreground">
        <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-500" />
        <span>{t("jwt.localOnly")}</span>
      </div>
      {/* 前缀剥离提示 */}
      {result.strippedPrefix && (
        <div className="flex items-center gap-2 px-4 pb-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{t("jwt.strippedPrefix")}&nbsp;<code className="font-mono font-semibold bg-amber-100 dark:bg-amber-900/40 px-1 rounded">{result.strippedPrefix}</code></span>
        </div>
      )}

      {/* 主工作区 - 双栏布局 */}
      <div className="flex flex-1 min-h-0 gap-0 px-4 pb-4">
        {/* 左栏 - 输入区 */}
        <div className="w-[45%] flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("jwt.tokenInput")}</h2>
            {token && (
              <Button size="sm" variant="ghost" onClick={handleClear} className="h-7 text-xs">
                <XIcon className="h-3 w-3" />
                {t("jwt.clear")}
              </Button>
            )}
          </div>
          <textarea
            className="flex-1 w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-mono placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
            placeholder={t("jwt.placeholder")}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* 右栏 - 输出区 */}
        <div className="w-[55%] flex flex-col gap-2 min-h-0 ps-3">
          <h2 className="text-sm font-semibold">{t("jwt.result")}</h2>

          {!token.trim() ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground/60">
              {t("jwt.emptyHint")}
            </div>
          ) : !result.isValid ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400 max-w-md text-center">
                <p className="font-medium mb-1">{t("jwt.invalid")}</p>
                {result.error && <p className="text-xs opacity-80">{result.error}</p>}
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-3 pe-2">
                {result.header && (
                  <SectionCard
                    theme="red"
                    label={t("jwt.header")}
                    hint={t("jwt.headerHint")}
                    copyText={JSON.stringify(result.header, null, 2)}
                    copyTitle={t("jwt.copyHeader")}
                    onCopy={handleCopy}
                  >
                    <JsonView data={result.header} theme="red" t={t} />
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
                    <JsonView data={result.payload} theme="blue" t={t} />
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
  );
}
