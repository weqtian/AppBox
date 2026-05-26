import URLCoderPage from "@/pages/URLCoderPage";
import UUIDGeneratorPage from "@/pages/UUIDGeneratorPage";
import ImageCompressorPage from "@/pages/ImageCompressorPage";
import ImageFormatConverterPage from "@/pages/ImageFormatConverterPage";
import StatusBar from "@components/StatusBar";
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
import { LinkIcon, FingerprintIcon, ImageDownIcon, ArrowRightLeftIcon } from "lucide-react";
import { useState, useCallback } from "react";
import { I18nProvider, useTranslation, localeNames, type Locale } from "@/i18n";
import type { TranslationKey } from "@/i18n";

export default function App() {
  const { t, locale, setLocale } = useTranslation();
  const [activeTab, setActiveTab] = useState("url");
  const [copyMessage, setCopyMessage] = useState(t("app.ready"));

  const handleCopy = useCallback(() => {
    setCopyMessage(t("app.copied"));
  }, [t]);

  const handleClearMessage = useCallback(() => {
    setCopyMessage(t("app.ready"));
  }, [t]);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>{t("app.tools")}</SidebarGroupLabel>
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
        </Sidebar>
        <SidebarInset>
          <main className="flex-1 overflow-auto">
            {activeTab === "url" && <URLCoderPage onCopy={handleCopy} />}
            {activeTab === "uuid" && <UUIDGeneratorPage onCopy={handleCopy} />}
            {activeTab === "image" && <ImageCompressorPage onCopy={handleCopy} />}
            {activeTab === "format" && <ImageFormatConverterPage onCopy={handleCopy} />}
          </main>
          <StatusBar message={copyMessage} onClear={handleClearMessage} />
        </SidebarInset>
      </SidebarProvider>
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