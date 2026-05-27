import URLCoderPage from "@/pages/URLCoderPage";
import UUIDGeneratorPage from "@/pages/UUIDGeneratorPage";
import ImageCompressorPage from "@/pages/ImageCompressorPage";
import ImageFormatConverterPage from "@/pages/ImageFormatConverterPage";
import JwtParserPage from "@/pages/JwtParserPage";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LinkIcon, FingerprintIcon, ImageDownIcon, ArrowRightLeftIcon, KeyRoundIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { I18nProvider, useTranslation, localeNames, type Locale } from "@/i18n";
import { QuitConfirmDialog, type QuitChoice } from "@/components/QuitConfirmDialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const { t, locale, setLocale, dir } = useTranslation();
  const [activeTab, setActiveTab] = useState("url");
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.listen("quit-requested", () => {
      setShowQuitDialog(true);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleQuitChoice = useCallback((choice: QuitChoice) => {
    setShowQuitDialog(false);
    if (choice !== "cancel") {
      invoke("execute_quit_choice", { choice });
    }
  }, []);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar side={dir === "rtl" ? "right" : "left"}>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>{t("sidebar.dataTools")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "url"}
                      onClick={() => setActiveTab("url")}
                      tooltip={t("sidebar.urlCoder")}
                    >
                      <LinkIcon />
                      <span>{t("sidebar.urlCoder")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "uuid"}
                      onClick={() => setActiveTab("uuid")}
                      tooltip={t("sidebar.uuidGenerator")}
                    >
                      <FingerprintIcon />
                      <span>{t("sidebar.uuidGenerator")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "jwt"}
                      onClick={() => setActiveTab("jwt")}
                      tooltip={t("sidebar.jwtParser")}
                    >
                      <KeyRoundIcon />
                      <span>{t("sidebar.jwtParser")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>{t("sidebar.imageTools")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "image"}
                      onClick={() => setActiveTab("image")}
                      tooltip={t("sidebar.imageCompressor")}
                    >
                      <ImageDownIcon />
                      <span>{t("sidebar.imageCompressor")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "format"}
                      onClick={() => setActiveTab("format")}
                      tooltip={t("sidebar.imageFormatConverter")}
                    >
                      <ArrowRightLeftIcon />
                      <span>{t("sidebar.imageFormatConverter")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-2">
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger className="h-8 text-xs">
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
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <main className="flex-1 overflow-auto">
            {activeTab === "url" && <URLCoderPage />}
            {activeTab === "uuid" && <UUIDGeneratorPage />}
            {activeTab === "image" && <ImageCompressorPage />}
            {activeTab === "format" && <ImageFormatConverterPage />}
            {activeTab === "jwt" && <JwtParserPage />}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <QuitConfirmDialog
        open={showQuitDialog}
        onOpenChange={setShowQuitDialog}
        onChoice={handleQuitChoice}
      />
    </TooltipProvider>
  );
}

function AppContent() {
  return (
    <I18nProvider>
      <App />
    </I18nProvider>
  );
}

export default AppContent;