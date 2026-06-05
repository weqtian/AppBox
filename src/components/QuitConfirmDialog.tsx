/**
 * 退出确认对话框
 *
 * 在用户关闭窗口时弹出，提供三个选项：
 * - 最小化到系统托盘（推荐，主操作）
 * - 退出程序（危险操作，红色按钮）
 * - 取消（关闭对话框）
 *
 * 布局采用纵向排列、宽松间距，符合中国桌面软件的使用习惯：
 * - 每个按钮独占一行，间距充足
 * - 主操作（最小化）最突出
 * - 危险操作（退出）使用红色警示
 * - 取消操作最不显眼
 *
 * @module components/QuitConfirmDialog
 */

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { MinimizeIcon, PowerIcon } from "lucide-react";

export type QuitChoice = "minimize" | "quit" | "cancel";

interface QuitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoice: (choice: QuitChoice) => void;
}

export function QuitConfirmDialog({
  open,
  onOpenChange,
  onChoice,
}: QuitConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {/* 隐藏触发器：对话框通过 open 属性程序化控制，不需要可见触发器 */}
      <AlertDialogTrigger asChild>
        <span className="hidden" />
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-85 gap-0 px-7 pt-7 pb-6">
        {/* 标题区 */}
        <AlertDialogHeader className="text-center sm:text-center gap-1">
          <AlertDialogTitle className="text-base">
            {t("quitDialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            {t("quitDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* 按钮区：纵向排列，宽松间距 */}
        <div className="mt-7 flex flex-col gap-3">
          {/* 主操作：最小化到托盘 */}
          <Button
            className="w-full h-9"
            onClick={() => onChoice("minimize")}
          >
            <MinimizeIcon className="size-4" />
            {t("quitDialog.minimize")}
          </Button>

          {/* 危险操作：退出 */}
          <Button
            variant="destructive"
            className="w-full h-9"
            onClick={() => onChoice("quit")}
          >
            <PowerIcon className="size-4" />
            {t("quitDialog.quit")}
          </Button>

          {/* 取消：用 outline 风格，视觉权重最低 */}
          <AlertDialogCancel
            className="w-full h-9 mt-1"
            onClick={() => onChoice("cancel")}
          >
            {t("quitDialog.cancel")}
          </AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
