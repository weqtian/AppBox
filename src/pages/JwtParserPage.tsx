import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CopyIcon, XIcon, ShieldCheckIcon, AlertTriangleIcon } from "lucide-react";
import { decodeJwt, formatTimestamp, isTimestampKey, type JwtResult } from "@/lib/jwt";
import { copyToClipboard } from "@/lib/clipboard";
import { useTranslation, type TranslationKey } from "@/i18n";

interface JwtParserPageProps {
  onCopy: () => void;
}

function JsonBlock({
  data,
  labelColor,
  onCopy,
  t,
  copyLabel,
}: {
  data: Record<string, unknown>;
  labelColor: string;
  onCopy: (text: string) => void;
  t: (key: TranslationKey) => string;
  copyLabel: string;
}) {
  const json = JSON.stringify(data, null, 2);

  // 提取时间戳字段
  const timestampFields = Object.entries(data).filter(([key]) => isTimestampKey(key));

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className={`text-xs font-bold tracking-wider uppercase ${labelColor}`}>
          {labelColor.includes("red") ? "HEADER" : "PAYLOAD"}
        </span>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => onCopy(json)}
          title={copyLabel}
        >
          <CopyIcon />
        </Button>
      </div>
      <CardContent className="p-0">
        <pre className="text-sm font-mono whitespace-pre-wrap break-all bg-muted/50 rounded-lg p-3 leading-relaxed">
          {syntaxHighlight(json, labelColor.includes("red") ? "red" : "blue")}
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
                        <span className="ml-2 text-xs text-muted-foreground/80">({ts.relative})</span>
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
      </CardContent>
    </Card>
  );
}

/** 简易 JSON 语法高亮 */
function syntaxHighlight(json: string, theme: "red" | "blue"): React.ReactNode[] {
  const lines = json.split("\n");
  const keyColor = theme === "red" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400";
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

export default function JwtParserPage({ onCopy }: JwtParserPageProps) {
  const { t } = useTranslation();
  const [token, setToken] = useState("");

  const result: JwtResult = useMemo(() => decodeJwt(token), [token]);

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
    onCopy();
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
        <div className="w-[55%] flex flex-col gap-2 min-h-0 pl-3">
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
              <div className="space-y-4 pr-2">
                {/* HEADER */}
                {result.header && (
                  <JsonBlock
                    data={result.header}
                    labelColor="text-red-500 dark:text-red-400"
                    onCopy={handleCopy}
                    t={t}
                    copyLabel={t("jwt.copyHeader")}
                  />
                )}
                {/* 分隔线 */}
                <div className="border-t" />
                {/* PAYLOAD */}
                {result.payload && (
                  <JsonBlock
                    data={result.payload}
                    labelColor="text-blue-500 dark:text-blue-400"
                    onCopy={handleCopy}
                    t={t}
                    copyLabel={t("jwt.copyPayload")}
                  />
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
