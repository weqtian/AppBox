import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { CopyIcon, RotateCcwIcon, LinkIcon, InfoIcon } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { useTranslation } from "@/i18n";

const URL_RE = /^(https?:\/\/|ftp:\/\/|www\.)/i;
const ENCODED_RE = /%[0-9A-Fa-f]{2}/;

export default function URLCoderPage() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");

  const trimmed = input.trim();
  const looksLikeUrl = trimmed.length > 0 && URL_RE.test(trimmed);
  const looksEncoded = trimmed.length > 0 && ENCODED_RE.test(trimmed);

  const encoded = input ? encodeURIComponent(input) : "";
  let decoded = "";
  try {
    decoded = input ? decodeURIComponent(input) : "";
  } catch {
    decoded = t("urlCoder.invalidEncodedString");
  }

  // 逐层解码：反复尝试 decodeURIComponent 直到无法继续
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

  const handleCopy = async (text: string) => {
    if (!text) return;
    await copyToClipboard(text);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("urlCoder.input")}</CardTitle>
          <CardAction>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setInput("")}
              disabled={!input}
            >
              <RotateCcwIcon data-icon="inline-start" />
              {t("urlCoder.clear")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={t("urlCoder.placeholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-24 font-mono"
          />
          {(looksLikeUrl || looksEncoded) && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              {looksLikeUrl ? (
                <>
                  <LinkIcon className="h-3.5 w-3.5 text-blue-500" />
                  <span>{t("urlCoder.detectedUrl")}</span>
                </>
              ) : (
                <>
                  <InfoIcon className="h-3.5 w-3.5 text-amber-500" />
                  <span>{t("urlCoder.detectedEncoded")}</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("urlCoder.encodeResult")}</CardTitle>
            <CardAction>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => handleCopy(encoded)}
                disabled={!encoded}
              >
                <CopyIcon />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={encoded}
              className="min-h-20 font-mono bg-muted/40"
              placeholder={t("urlCoder.encodePlaceholder")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("urlCoder.decodeResult")}</CardTitle>
            <CardAction>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => handleCopy(decoded)}
                disabled={!decoded || decoded === t("urlCoder.invalidEncodedString")}
              >
                <CopyIcon />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={decoded}
              className="min-h-20 font-mono bg-muted/40"
              placeholder={t("urlCoder.decodePlaceholder")}
            />
          </CardContent>
        </Card>
      </div>

      {deepDecoded !== decoded && deepDecoded !== input && input && (
        <Card>
          <CardHeader>
            <CardTitle>{t("urlCoder.deepDecodeResult")}</CardTitle>
            <CardAction>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => handleCopy(deepDecoded)}
              >
                <CopyIcon />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={deepDecoded}
              className="min-h-20 font-mono bg-muted/40"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
