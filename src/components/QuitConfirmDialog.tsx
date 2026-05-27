import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("quitDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("quitDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onChoice("cancel")}>
            {t("quitDialog.cancel")}
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => onChoice("minimize")}
          >
            {t("quitDialog.minimize")}
          </Button>
          <AlertDialogAction onClick={() => onChoice("quit")}>
            {t("quitDialog.quit")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
