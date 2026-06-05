/**
 * 应用主组件
 *
 * 负责整体布局和页面路由：
 * - 左侧边栏：工具分组导航（数据工具 / 图片工具）+ 语言切换
 * - 右侧内容区：根据活跃标签页渲染对应的工具页面
 * - 退出确认对话框：拦截窗口关闭事件
 *
 * 导航采用条件渲染（非 React Router），各页面组件在切换时重新挂载。
 *
 * @module App
 */

import URLCoderPage from "@/pages/URLCoderPage";
import UUIDGeneratorPage from "@/pages/UUIDGeneratorPage";
import ImageCompressorPage from "@/pages/ImageCompressorPage";
import ImageFormatConverterPage from "@/pages/ImageFormatConverterPage";
import JwtParserPage from "@/pages/JwtParserPage";
import VideoFrameExtractorPage from "@/pages/VideoFrameExtractorPage";
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
import { LinkIcon, FingerprintIcon, ImageDownIcon, ArrowRightLeftIcon, KeyRoundIcon, VideoIcon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { I18nProvider, useTranslation, localeNames, type Locale } from "@/i18n";
import { QuitConfirmDialog, type QuitChoice } from "@/components/QuitConfirmDialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

/**
 * 主应用组件
 *
 * 包含侧边栏导航、内容区域和退出对话框。
 * 必须在 I18nProvider 内部使用（由 AppContent 包裹）。
 */
function App() {
  const { t, locale, setLocale, dir } = useTranslation();
  const [activeTab, setActiveTab] = useState("url");
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  // 监听 Rust 后端发送的退出请求事件（窗口关闭时触发）
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.listen("quit-requested", () => {
      setShowQuitDialog(true);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  /** 处理退出对话框的用户选择 */
  const handleQuitChoice = useCallback((choice: QuitChoice) => {
    setShowQuitDialog(false);
    if (choice !== "cancel") {
      invoke("execute_quit_choice", { choice });
    }
  }, []);

  return (
    <TooltipProvider>
      <SidebarProvider>
        {/* 侧边栏：RTL 模式下自动切换到右侧 */}
        <Sidebar side={dir === "rtl" ? "right" : "left"}>
          <SidebarContent>
            {/* 数据工具分组 */}
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
            {/* 图片工具分组 */}
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
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "video"}
                      onClick={() => setActiveTab("video")}
                      tooltip={t("sidebar.videoExtractor")}
                    >
                      <VideoIcon />
                      <span>{t("sidebar.videoExtractor")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          {/* 语言选择器 */}
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
        {/* 内容区域 */}
        <SidebarInset>
          <main className="flex-1 overflow-auto">
            {activeTab === "url" && <URLCoderPage />}
            {activeTab === "uuid" && <UUIDGeneratorPage />}
            {activeTab === "image" && <ImageCompressorPage />}
            {activeTab === "format" && <ImageFormatConverterPage />}
            {activeTab === "jwt" && <JwtParserPage />}
            {activeTab === "video" && <VideoFrameExtractorPage />}
          </main>
        </SidebarInset>
      </SidebarProvider>
      {/* 退出确认对话框 */}
      <QuitConfirmDialog
        open={showQuitDialog}
        onOpenChange={setShowQuitDialog}
        onChoice={handleQuitChoice}
      />
    </TooltipProvider>
  );
}

/**
 * 应用根组件
 *
 * 包裹 I18nProvider，为整个应用提供国际化上下文。
 */
function AppContent() {
  return (
    <I18nProvider>
      <App />
    </I18nProvider>
  );
}

export default AppContent;
