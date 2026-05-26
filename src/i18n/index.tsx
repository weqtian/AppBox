import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import zhCN from "./locales/zh-CN";
import en from "./locales/en";
import ja from "./locales/ja";
import ar from "./locales/ar";
import type { Translations } from "./locales/zh-CN";

export type Locale = "zh-CN" | "en" | "ja" | "ar";

const localeMap: Record<Locale, Translations> = { "zh-CN": zhCN, en, ja, ar };

export const localeNames: Record<Locale, string> = {
  "zh-CN": "中文",
  en: "English",
  ja: "日本語",
  ar: "العربية",
};

export const localeDirections: Record<Locale, "ltr" | "rtl"> = {
  "zh-CN": "ltr",
  en: "ltr",
  ja: "ltr",
  ar: "rtl",
};

type NestedKeyOf<T> = T extends object
  ? { [K in keyof T & string]: T[K] extends string ? K : `${K}.${NestedKeyOf<T[K]>}` }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<Translations>;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // fallback: return key itself
    }
  }
  return typeof current === "string" ? current : path;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "appbox-locale";

function getSavedLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in localeMap) return saved as Locale;
  } catch {
    // ignore
  }
  return "zh-CN";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getSavedLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // ignore
    }
  }, []);

  const dir = localeDirections[locale];

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  const t = useCallback(
    (key: TranslationKey) => getNestedValue(localeMap[locale] as unknown as Record<string, unknown>, key),
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
