import { useEffect } from "react";

interface StatusBarProps {
  message: string;
  onClear: () => void;
}

export default function StatusBar({ message, onClear }: StatusBarProps) {
  useEffect(() => {
    if (message !== "就绪") {
      const timer = setTimeout(onClear, 2000);
      return () => clearTimeout(timer);
    }
  }, [message, onClear]);

  return (
    <footer className="h-8 border-t flex items-center justify-end px-3 text-xs text-muted-foreground">
      <span>{message}</span>
    </footer>
  );
}