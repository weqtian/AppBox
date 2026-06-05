/**
 * JSON 格式化/美化页面
 *
 * 提供 JSON 文本的实时格式化与美化功能，支持：
 * - 实时解析与格式化（输入即输出）
 * - 语法高亮显示（key/string/number/boolean/null 着色）
 * - 缩进选择（2 空格 / 4 空格 / Tab）
 * - 压缩模式（单行紧凑 JSON）
 * - 错误定位（显示行列号）
 * - 一键复制格式化结果
 *
 * 布局：顶部工具栏 + 左右分栏（左：输入 / 右：格式化结果）+ 底部提示
 *
 * @module pages/JsonFormatterPage
 */

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyIcon, XIcon, BracesIcon, AlertTriangleIcon, FileJsonIcon } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { useTranslation, type TranslationKey } from "@/i18n";

// ============================================================
// 类型定义
// ============================================================

/** 缩进选项 */
type IndentType = "2" | "4" | "tab";

/** 解析结果状态 */
interface ParseSuccess {
  ok: true;
  formatted: string;
}

interface ParseError {
  ok: false;
  message: string;
  line?: number;
  col?: number;
}

type ParseResult = ParseSuccess | ParseError;

// ============================================================
// 语法高亮
// ============================================================

/** JSON 语法高亮的配色 */
const COLORS = {
  key: "text-blue-600 dark:text-blue-400",
  string: "text-emerald-700 dark:text-emerald-400",
  number: "text-purple-600 dark:text-purple-400",
  boolNull: "text-orange-600 dark:text-orange-400",
};

/** 对格式化后的 JSON 进行语法高亮渲染 */
function syntaxHighlight(json: string): React.ReactNode[] {
  const lines = json.split("\n");
  return lines.map((line, i) => {
    // 匹配 key: "xxx" 或 key: value 模式
    const keyMatch = line.match(/^(\s*)"([^"]+)"(\s*:\s*)/);
    if (keyMatch) {
      const [, indent, key, colon] = keyMatch;
      const rest = line.slice(keyMatch[0].length);
      const valueNode = colorizeValue(rest);
      return (
        <div key={i}>
          {indent}&quot;<span className={COLORS.key}>{key}</span>&quot;{colon}{valueNode}
        </div>
      );
    }
    return <div key={i}>{line}</div>;
  });
}

/** 对 JSON 值部分着色 */
function colorizeValue(value: string): React.ReactNode {
  const trimmed = value.replace(/,\s*$/, "");
  const comma = value.endsWith(",") ? "," : "";

  if (trimmed.startsWith('"')) return <span className={COLORS.string}>{trimmed}</span>;
  if (trimmed === "true" || trimmed === "false") return <span className={COLORS.boolNull}>{trimmed}{comma}</span>;
  if (trimmed === "null") return <span className={COLORS.boolNull}>{trimmed}{comma}</span>;
  if (!isNaN(Number(trimmed)) && trimmed !== "") return <span className={COLORS.number}>{trimmed}{comma}</span>;
  return <>{value}</>;
}

// ============================================================
// JSON 解析
// ============================================================

/** 从 SyntaxError.message 中尝试提取行列号 */
function extractPosition(message: string): { line?: number; col?: number } {
  // Chrome: "at position 5 (line 2 column 1)"
  const chromeMatch = message.match(/line (\d+) column (\d+)/);
  if (chromeMatch) return { line: +chromeMatch[1], col: +chromeMatch[2] };

  // Firefox/Safari: "at line 2 column 5"
  const ffMatch = message.match(/line (\d+) column (\d+)/i);
  if (ffMatch) return { line: +ffMatch[1], col: +ffMatch[2] };

  // Generic position: "at position N"
  return {};
}

/** 解析 JSON 并格式化 */
function parseAndFormat(input: string, indent: string, minify: boolean): ParseResult {
  if (!input.trim()) return { ok: true, formatted: "" };

  try {
    const obj = JSON.parse(input);
    const formatted = minify
      ? JSON.stringify(obj)
      : JSON.stringify(obj, null, indent);
    return { ok: true, formatted };
  } catch (err) {
    const message = err instanceof SyntaxError ? err.message : String(err);
    const pos = extractPosition(message);
    return { ok: false, message, ...pos };
  }
}

// ============================================================
// 页面主体
// ============================================================

export default function JsonFormatterPage() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState<IndentType>("2");
  const [minify, setMinify] = useState(false);
  const [copied, setCopied] = useState(false);

  /** 计算缩进字符串 */
  const indentStr = indent === "tab" ? "\t" : "  ".repeat(indent === "4" ? 2 : 1);

  /** 实时解析并格式化 */
  const result = useMemo(
    () => parseAndFormat(input, indentStr, minify),
    [input, indentStr, minify],
  );

  /** 复制格式化结果 */
  const handleCopy = useCallback(async () => {
    if (!result.ok || !result.formatted) return;
    await copyToClipboard(result.formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [result]);

  /** 清空输入 */
  const handleClear = useCallback(() => {
    setInput("");
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <div className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        <div className="flex items-center justify-between px-4 py-2.5 gap-3">
          {/* 左侧：标题 */}
          <div className="flex items-center gap-2 shrink-0">
            <BracesIcon className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">{t("json.title")}</h2>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-2">
            {/* 缩进选择 */}
            <Select value={indent} onValueChange={(v) => setIndent(v as IndentType)}>
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">{t("json.indent2")}</SelectItem>
                <SelectItem value="4">{t("json.indent4")}</SelectItem>
                <SelectItem value="tab">{t("json.indentTab")}</SelectItem>
              </SelectContent>
            </Select>

            {/* 格式化/压缩 切换 */}
            <Button
              size="xs"
              variant={minify ? "default" : "outline"}
              onClick={() => setMinify(false)}
            >
              {t("json.format")}
            </Button>
            <Button
              size="xs"
              variant={minify ? "default" : "outline"}
              onClick={() => setMinify(true)}
            >
              {t("json.minify")}
            </Button>

            {/* 清空 */}
            <Button size="xs" variant="ghost" onClick={handleClear}>
              <XIcon className="size-3" />
              {t("json.clear")}
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容区：左右分栏 */}
      <div className="flex flex-1 min-h-0">
        {/* 左侧：输入区 */}
        <div className="w-[42%] flex flex-col min-h-0 border-e">
          <textarea
            className="flex-1 w-full resize-none bg-transparent px-4 py-3 text-sm font-mono outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("json.placeholder")}
            spellCheck={false}
          />
        </div>

        {/* 右侧：输出区 */}
        <div className="w-[58%] flex flex-col min-h-0">
          {/* 输出标题栏 */}
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="text-xs text-muted-foreground">{t("json.output")}</span>
            {result.ok && result.formatted && (
              <Button size="icon-xs" variant="ghost" onClick={handleCopy}>
                {copied ? (
                  <span className="text-xs text-emerald-600">{t("json.copied")}</span>
                ) : (
                  <CopyIcon className="size-3.5" />
                )}
              </Button>
            )}
          </div>

          {/* 内容区 */}
          <div className="flex-1 min-h-0">
            {!input.trim() ? (
              /* 空状态 */
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <FileJsonIcon className="size-8 opacity-30" />
                <p className="text-xs">{t("json.emptyHint")}</p>
              </div>
            ) : !result.ok ? (
              /* 错误状态 */
              <div className="flex items-start gap-3 p-4">
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/70 px-3 py-2 text-sm dark:border-red-900/60 dark:bg-red-950/30">
                  <AlertTriangleIcon className="size-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-400">{t("json.error")}</p>
                    {result.line && result.col && (
                      <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                        {t("json.errorAt" as TranslationKey)
                          .replace("{line}", String(result.line))
                          .replace("{col}", String(result.col))}
                      </p>
                    )}
                    <p className="text-xs text-red-600/60 dark:text-red-400/60 mt-1 font-mono break-all">
                      {result.message}
                    </p>
                  </div>
                </div>
              </div>
            ) : !result.formatted ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <FileJsonIcon className="size-8 opacity-30" />
                <p className="text-xs">{t("json.emptyHint")}</p>
              </div>
            ) : (
              /* 成功：语法高亮输出 */
              <ScrollArea className="h-full">
                <pre className="p-4 pe-6 text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {syntaxHighlight(result.formatted)}
                </pre>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>

      {/* 底部提示条 */}
      <div className="border-t px-4 py-1.5 text-xs text-muted-foreground">
        {t("json.localOnly")}
      </div>
    </div>
  );
}
