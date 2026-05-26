import { useState } from "react";
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
import { CopyIcon, RefreshCwIcon } from "lucide-react";
import { v1 as uuidv1, v4 as uuidv4 } from "uuid";
import { copyToClipboard } from "@/lib/clipboard";
import { useTranslation } from "@/i18n";

interface UUIDGeneratorPageProps {
  onCopy: () => void;
}

export default function UUIDGeneratorPage({ onCopy }: UUIDGeneratorPageProps) {
  const { t } = useTranslation();
  const [count, setCount] = useState(1);
  const [version, setVersion] = useState("v4");
  const [uuids, setUuids] = useState<string[]>([]);

  const handleGenerate = () => {
    const countNum = Math.min(100, Math.max(1, count || 1));
    const generate = version === "v4" ? uuidv4 : uuidv1;
    const newUuids = Array.from({ length: countNum }, () => generate());
    setUuids(newUuids);
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
      <div className="flex items-center gap-2">
        <Select value={version} onValueChange={setVersion}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="v4">UUID v4</SelectItem>
              <SelectItem value="v1">UUID v1</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input
          type="number"
          min={1}
          max={100}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-24"
        />
        <Button onClick={handleGenerate}>
          <RefreshCwIcon data-icon="inline-start" />
          {t("uuid.generate")}
        </Button>
        {uuids.length > 0 && (
          <Button variant="outline" onClick={copyAll}>
            <CopyIcon data-icon="inline-start" />
            {t("uuid.copyAll")}
          </Button>
        )}
      </div>

      {uuids.length > 0 && (
        <ScrollArea className="h-64 border rounded-md">
          <div className="p-2">
            {uuids.map((uuid, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-1 hover:bg-muted rounded-sm"
              >
                <code className="text-sm px-2">{uuid}</code>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => copySingle(uuid)}
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
