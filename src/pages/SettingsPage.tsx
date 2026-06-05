/**
 * 设置中心页面
 *
 * 提供应用的统一设置入口，包含三个分组卡片区域：
 * - 外观：主题切换（跟随系统 / 浅色 / 深色）
 * - 语言：界面显示语言选择
 * - 关于：应用名称、描述、版本号
 *
 * 布局采用分组 Card 样式，每个卡片独立一个设置主题，
 * 卡片之间使用 Separator 分隔，清晰直观。
 *
 * @module pages/SettingsPage
 */

import { useTranslation, localeNames, type Locale } from "@/i18n";
import { useTheme, type ThemePreference } from "@/hooks/use-theme";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BoxIcon } from "lucide-react";

/** 主题选项定义（key → i18n key 后缀） */
const themeOptions: { value: ThemePreference; labelKey: string }[] = [
  { value: "system", labelKey: "settings.themeSystem" },
  { value: "light", labelKey: "settings.themeLight" },
  { value: "dark", labelKey: "settings.themeDark" },
];

export default function SettingsPage() {
  const { t, locale, setLocale } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col h-full">
      <div className="max-w-2xl mx-auto w-full p-6 space-y-6">
        {/* 页面标题 */}
        <h1 className="text-lg font-semibold">{t("settings.title")}</h1>

        {/* 外观设置 */}
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("settings.appearance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm">{t("settings.theme")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("settings.themeDesc")}
                </p>
              </div>
              <Select value={theme} onValueChange={(v) => setTheme(v as ThemePreference)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {themeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* 语言设置 */}
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("settings.language")}</CardTitle>
            <CardDescription>{t("settings.languageDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(localeNames) as [Locale, string][]).map(([key, name]) => (
                  <SelectItem key={key} value={key}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Separator />

        {/* 关于 */}
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("settings.about")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 应用图标 + 名称 + 描述 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
                <BoxIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">AppBox</p>
                <p className="text-xs text-muted-foreground">
                  {t("settings.appDescription")}
                </p>
              </div>
            </div>

            <Separator />

            {/* 版本号 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("settings.version")}
              </span>
              <span className="text-sm font-medium">
                v{__APP_VERSION__}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
