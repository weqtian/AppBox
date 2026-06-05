/**
 * UUID 生成器页面
 *
 * 提供批量 UUID 生成功能，支持：
 * - UUID v4（随机）和 v1（基于时间戳）
 * - 批量生成（1~100 个）
 * - 格式控制：连字符开关、大写开关
 * - 一键复制单个或全部
 *
 * 布局：顶部工具栏（版本+数量+格式+生成按钮）+ 列表结果区
 *
 * @module pages/UUIDGeneratorPage
 */

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyIcon, RefreshCwIcon, FingerprintIcon, HashIcon, CaseSensitiveIcon } from "lucide-react";
import { v1 as uuidv1, v4 as uuidv4 } from "uuid";
import { copyToClipboard } from "@/lib/clipboard";
import { useTranslation } from "@/i18n";

/** 应用格式化（去连字符、大写） */
function applyFormat(uuid: string, hyphens: boolean, uppercase: boolean): string {
  let out = uuid;
  if (!hyphens) out = out.replace(/-/g, "");
  if (uppercase) out = out.toUpperCase();
  return out;
}

export default function UUIDGeneratorPage() {
  const { t } = useTranslation();
  const [count, setCount] = useState(1);
  const [version, setVersion] = useState("v4");
  const [hyphens, setHyphens] = useState(true);
  const [uppercase, setUppercase] = useState(false);
  const [rawUuids, setRawUuids] = useState<string[]>([]);

  const uuids = useMemo(
    () => rawUuids.map((u) => applyFormat(u, hyphens, uppercase)),
    [rawUuids, hyphens, uppercase]
  );

  const handleGenerate = useCallback(() => {
    const countNum = Math.min(100, Math.max(1, count || 1));
    const generate = version === "v4" ? uuidv4 : uuidv1;
    setRawUuids(Array.from({ length: countNum }, () => generate()));
  }, [count, version]);

  const copySingle = useCallback(async (uuid: string) => {
    await copyToClipboard(uuid);
  }, []);

  const copyAll = useCallback(async () => {
    await copyToClipboard(uuids.join("\n"));
  }, [uuids]);

  return (
    <div className="flex flex-col h-full">
      {/* ============================================================ */}
      {/* 顶部工具栏 */}
      {/* ============================================================ */}
      <div className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        <div className="flex items-center gap-3 px-4 py-2.5">
          {/* UUID 版本选择 */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Select value={version} onValueChange={setVersion}>
                    <SelectTrigger className="h-7 min-w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="v4">UUID v4</SelectItem>
                        <SelectItem value="v1">UUID v1</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {version === "v4" ? t("uuid.versionV4Hint") : t("uuid.versionV1Hint")}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* 生成数量 */}
          <Input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-20 h-7 text-xs"
            aria-label={t("uuid.count")}
          />

          {/* 生成按钮 */}
          <Button size="sm" onClick={handleGenerate}>
            <RefreshCwIcon className="size-3.5" />
            {t("uuid.generate")}
          </Button>

          {/* 分隔 */}
          <div className="w-px h-5 bg-border" />

          {/* 格式开关 */}
          <Button
            size="xs"
            variant={hyphens ? "secondary" : "ghost"}
            onClick={() => setHyphens((v) => !v)}
            aria-pressed={hyphens}
          >
            <HashIcon className="size-3" />
            {t("uuid.hyphens")}
          </Button>
          <Button
            size="xs"
            variant={uppercase ? "secondary" : "ghost"}
            onClick={() => setUppercase((v) => !v)}
            aria-pressed={uppercase}
          >
            <CaseSensitiveIcon className="size-3" />
            {t("uuid.uppercase")}
          </Button>

          {/* 复制全部（右对齐） */}
          {uuids.length > 0 && (
            <Button size="xs" variant="outline" onClick={copyAll} className="ms-auto">
              <CopyIcon className="size-3" />
              {t("uuid.copyAll")}
            </Button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 结果区 */}
      {/* ============================================================ */}
      <div className="flex-1 min-h-0">
        {uuids.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50">
            <FingerprintIcon className="size-8 mb-2" />
            <p className="text-sm">{t("uuid.emptyHint")}</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              {uuids.map((uuid, idx) => (
                <div
                  key={idx}
                  className="group flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[10px] text-muted-foreground/50 tabular-nums w-5 shrink-0 text-right">
                      {idx + 1}
                    </span>
                    <code className="text-sm font-mono break-all">{uuid}</code>
                  </div>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => copySingle(uuid)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title={t("uuid.copyAll")}
                  >
                    <CopyIcon className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
