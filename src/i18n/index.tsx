/**
 * 国际化（i18n）模块
 *
 * 提供自研的轻量级国际化方案，基于 React Context + Hook 模式：
 * - `I18nProvider`：在组件树顶层提供翻译上下文
 * - `useTranslation`：在组件中获取翻译函数 `t()`、当前语言 `locale` 和文本方向 `dir`
 * - 支持 4 种语言：中文（zh-CN）、英语（en）、日语（ja）、阿拉伯语（ar）
 * - 阿拉伯语自动切换 RTL 布局
 * - 语言偏好持久化到 localStorage
 * - 翻译 key 支持嵌套点号路径（如 `urlCoder.input`）
 * - `TranslationKey` 类型提供编译时的 key 安全检查
 *
 * @module i18n
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import zhCN from "./locales/zh-CN";
import en from "./locales/en";
import ja from "./locales/ja";
import ar from "./locales/ar";
import type { Translations } from "./locales/zh-CN";

// ============================================================
// 类型定义
// ============================================================

/** 支持的语言标识 */
export type Locale = "zh-CN" | "en" | "ja" | "ar";

/** 各语言的翻译数据（类型安全：所有语言必须与 zh-CN 结构一致） */
const localeMap: Record<Locale, Translations> = { "zh-CN": zhCN, en, ja, ar };

/** 语言的显示名称（用于语言选择器） */
export const localeNames: Record<Locale, string> = {
  "zh-CN": "中文",
  en: "English",
  ja: "日本語",
  ar: "العربية",
};

/** 语言的文本方向（阿拉伯语为 RTL） */
export const localeDirections: Record<Locale, "ltr" | "rtl"> = {
  "zh-CN": "ltr",
  en: "ltr",
  ja: "ltr",
  ar: "rtl",
};

// ============================================================
// 翻译 key 类型推导
// ============================================================

/**
 * 递归提取嵌套对象的所有叶子节点的点号路径
 *
 * 例如：`{ a: { b: "x", c: "y" } }` → `"a.b" | "a.c"`
 */
type NestedKeyOf<T> = T extends object
  ? { [K in keyof T & string]: T[K] extends string ? K : `${K}.${NestedKeyOf<T[K]>}` }[keyof T & string]
  : never;

/** 所有可用的翻译 key（编译时检查） */
export type TranslationKey = NestedKeyOf<Translations>;

// ============================================================
// 翻译函数实现
// ============================================================

/**
 * 通过点号路径获取嵌套对象中的字符串值
 *
 * @param obj - 翻译数据对象
 * @param path - 点号分隔的 key 路径（如 "sidebar.urlCoder"）
 * @returns 翻译后的字符串，找不到时返回 key 本身作为 fallback
 */
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

// ============================================================
// Context
// ============================================================

/** i18n 上下文值 */
interface I18nContextValue {
  /** 当前语言标识 */
  locale: Locale;
  /** 切换语言 */
  setLocale: (locale: Locale) => void;
  /** 翻译函数 */
  t: (key: TranslationKey) => string;
  /** 当前文本方向 */
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** localStorage 中保存语言偏好的 key */
const STORAGE_KEY = "appbox-locale";

/**
 * 从 localStorage 恢复已保存的语言偏好
 *
 * @returns 保存的语言标识，无记录时默认 "zh-CN"
 */
function getSavedLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in localeMap) return saved as Locale;
  } catch {
    // ignore（隐私模式等场景）
  }
  return "zh-CN";
}

// ============================================================
// Provider 组件
// ============================================================

/**
 * 国际化 Provider
 *
 * 在组件树顶层包裹，为子组件提供翻译功能。
 * 自动同步 `document.documentElement` 的 `lang` 和 `dir` 属性。
 *
 * @param children - 子组件
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getSavedLocale);

  /** 切换语言并持久化到 localStorage */
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // ignore
    }
  }, []);

  const dir = localeDirections[locale];

  // 同步 HTML 元素的 lang 和 dir 属性
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  /** 翻译函数：根据 key 获取当前语言的文本 */
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

// ============================================================
// Hook
// ============================================================

/**
 * 获取国际化上下文
 *
 * 必须在 `I18nProvider` 内部使用，否则抛出错误。
 *
 * @returns i18n 上下文值（locale, setLocale, t, dir）
 *
 * @example
 * const { t, locale, setLocale, dir } = useTranslation();
 * return <p>{t("sidebar.urlCoder")}</p>;
 */
export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
