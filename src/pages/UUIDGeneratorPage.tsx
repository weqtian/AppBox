import { useState, useMemo } from "react";
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
import { CopyIcon, RefreshCwIcon } from "lucide-react";
import { v1 as uuidv1, v4 as uuidv4 } from "uuid";
import { copyToClipboard } from "@/lib/clipboard";
import { useTranslation } from "@/i18n";

interface UUIDGeneratorPageProps {
  onCopy: () => void;
}

function applyFormat(uuid: string, hyphens: boolean, uppercase: boolean): string {
  let out = uuid;
  if (!hyphens) out = out.replace(/-/g, "");
  if (uppercase) out = out.toUpperCase();
  return out;
}

export default function UUIDGeneratorPage({ onCopy }: UUIDGeneratorPageProps) {
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

  const handleGenerate = () => {
    const countNum = Math.min(100, Math.max(1, count || 1));
    const generate = version === "v4" ? uuidv4 : uuidv1;
    setRawUuids(Array.from({ length: countNum }, () => generate()));
  };

  const copySingle = async (uuid: string) => {
    await copyToClipboard(uuid);
    onCopy();
  };

  const copyAll = async () => {
    await copyToClipboard(uuids.join("\n"));
    onCopy();
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* 设置区 */}
      <div className="flex flex-wrap items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Select value={version} onValueChange={setVersion}>
                <SelectTrigger className="min-w-28">
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

        <Input
          type="number"
          min={1}
          max={100}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-24"
          aria-label={t("uuid.count")}
        />
        <Button onClick={handleGenerate}>
          <RefreshCwIcon data-icon="inline-start" />
          {t("uuid.generate")}
        </Button>

        {/* 格式开关 */}
        <div className="flex items-center gap-1.5 ms-2">
          <Button
            size="sm"
            variant={hyphens ? "secondary" : "outline"}
            onClick={() => setHyphens((v) => !v)}
            aria-pressed={hyphens}
          >
            {t("uuid.hyphens")}
          </Button>
          <Button
            size="sm"
            variant={uppercase ? "secondary" : "outline"}
            onClick={() => setUppercase((v) => !v)}
            aria-pressed={uppercase}
          >
            {t("uuid.uppercase")}
          </Button>
        </div>

        {uuids.length > 0 && (
          <Button variant="outline" onClick={copyAll} className="ms-auto">
            <CopyIcon data-icon="inline-start" />
            {t("uuid.copyAll")}
          </Button>
        )}
      </div>

      {/* 结果区 */}
      {uuids.length === 0 ? (
        <div className="h-64 flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground/60">
          {t("uuid.emptyHint")}
        </div>
      ) : (
        <ScrollArea className="h-[28rem] rounded-lg border bg-muted/30 p-2">
          <div className="flex flex-col gap-1.5">
            {uuids.map((uuid, idx) => (
              <div
                key={idx}
                className="group flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-1.5 hover:border-primary/40 hover:shadow-sm transition-colors"
              >
                <code className="text-sm font-mono break-all min-w-0 flex-1">{uuid}</code>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => copySingle(uuid)}
                  className="opacity-60 group-hover:opacity-100 transition-opacity"
                  title={t("uuid.copyAll")}
                >
                  <CopyIcon />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
