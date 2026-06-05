/**
 * JWT 解析工具库
 *
 * 提供 JWT Token 的解码、时间戳格式化等功能。
 * 支持自动剥离 Bearer/Basic/Token/JWT 等常见前缀，
 * 时间戳字段自动格式化为本地时间并计算相对时间。
 *
 * @module lib/jwt
 */

// ============================================================
// 类型定义
// ============================================================

/** JWT 解码结果 */
export interface JwtResult {
  /** 解码后的 Header 对象，解析失败时为 null */
  header: Record<string, unknown> | null;
  /** 解码后的 Payload 对象，解析失败时为 null */
  payload: Record<string, unknown> | null;
  /** Signature 部分的原始字符串，解析失败时为 null */
  signature: string | null;
  /** Token 是否有效（格式正确且可解析） */
  isValid: boolean;
  /** 错误信息（仅在解析失败时存在） */
  error?: string;
  /** 自动剥离的前缀（如 "Bearer"），未剥离时为 undefined */
  strippedPrefix?: string;
}

/** 时间戳格式化结果 */
export interface TimestampFormatResult {
  /** 格式化后的本地时间字符串（如 "2025-01-15 14:30:00"） */
  formatted: string;
  /** 相对时间描述（如 "3 天后"、"刚刚过去"） */
  relative: string;
}

// ============================================================
// 前缀剥离
// ============================================================

/**
 * 常见的 Authorization 头前缀，按长度降序排列以优先匹配更长的前缀。
 * 匹配时大小写不敏感，前缀后可跟空格或等号。
 */
const AUTH_PREFIXES = [
  "Bearer",
  "Basic",
  "Token",
  "JWT",
] as const;

/** 前缀匹配正则（编译一次，复用） */
const PREFIX_RE = new RegExp(
  `^(?:${AUTH_PREFIXES.map((p) => p.toLowerCase()).join("|")})[\\s=]+`,
  "i"
);

/**
 * 剥离 JWT 字符串中可能存在的前缀（如 "Bearer "、"Token "），
 * 同时去除首尾空白和不可见字符。
 *
 * @param raw - 原始输入字符串
 * @returns 剥离结果，包含清理后的 token 和被剥离的前缀
 */
function stripPrefix(raw: string): { token: string; prefix?: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(PREFIX_RE);
  if (match) {
    const prefix = match[0].trim();
    const token = trimmed.slice(match[0].length).trim();
    return { token, prefix };
  }
  return { token: trimmed };
}

// ============================================================
// Base64URL 解码
// ============================================================

/**
 * Base64URL 解码
 *
 * 将 Base64URL 编码的字符串解码为 UTF-8 字符串。
 * 自动处理 Base64URL 与标准 Base64 的差异（`-` → `+`，`_` → `/`，补 `=`）。
 *
 * @param str - Base64URL 编码的字符串
 * @returns 解码后的 UTF-8 字符串
 */
function base64UrlDecode(str: string): string {
  // Base64URL → 标准 Base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // 补齐 padding
  while (base64.length % 4) {
    base64 += "=";
  }
  // 解码为 UTF-8
  return decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

// ============================================================
// JWT 解码
// ============================================================

/**
 * 解码 JWT Token
 *
 * 对原始输入进行解析，自动剥离常见前缀，返回结构化的解码结果。
 * 不验证签名，仅做格式解析。
 *
 * @param raw - 原始 JWT 字符串（可能包含 Bearer 等前缀）
 * @param errorMessage - 格式无效时的错误信息（支持国际化）
 * @param parseErrorPrefix - 解析失败时的错误前缀（支持国际化）
 * @returns JWT 解码结果
 */
export function decodeJwt(
  raw: string,
  errorMessage = "JWT 格式无效，必须包含两个「.」分隔符",
  parseErrorPrefix = "解析失败: "
): JwtResult {
  if (!raw.trim()) {
    return { header: null, payload: null, signature: null, isValid: false };
  }

  const { token, prefix: strippedPrefix } = stripPrefix(raw);

  if (!token) {
    return { header: null, payload: null, signature: null, isValid: false };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return {
      header: null,
      payload: null,
      signature: null,
      isValid: false,
      error: errorMessage,
      strippedPrefix,
    };
  }

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return { header, payload, signature: parts[2], isValid: true, strippedPrefix };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      header: null,
      payload: null,
      signature: null,
      isValid: false,
      error: parseErrorPrefix + message,
      strippedPrefix,
    };
  }
}

// ============================================================
// 时间戳格式化
// ============================================================

/** JWT 中常见的时间戳字段名 */
const TIMESTAMP_KEYS = ["exp", "iat", "nbf", "auth_time"];

/**
 * 相对时间文本配置（支持国际化）
 *
 * 包含 6 个文本模板，用于生成相对时间描述。
 * 默认提供中文文本，可通过参数覆盖。
 */
export interface RelativeTimeTexts {
  /** 即将发生（如 "即将到来"） */
  upcoming: string;
  /** 刚刚过去（如 "刚刚过去"） */
  justPast: string;
  /** 未来分钟（如 "{n} 分钟后"） */
  minutesLater: string;
  /** 过去分钟（如 "{n} 分钟前"） */
  minutesAgo: string;
  /** 未来小时（如 "{n} 小时后"） */
  hoursLater: string;
  /** 过去小时（如 "{n} 小时前"） */
  hoursAgo: string;
  /** 未来天（如 "{n} 天后"） */
  daysLater: string;
  /** 过去天（如 "{n} 天前"） */
  daysAgo: string;
}

/** 默认的中文相对时间文本 */
const DEFAULT_RELATIVE_TIME_TEXTS: RelativeTimeTexts = {
  upcoming: "即将到来",
  justPast: "刚刚过去",
  minutesLater: "{n} 分钟后",
  minutesAgo: "{n} 分钟前",
  hoursLater: "{n} 小时后",
  hoursAgo: "{n} 小时前",
  daysLater: "{n} 天后",
  daysAgo: "{n} 天前",
};

/**
 * 格式化时间戳字段
 *
 * 将 JWT 中的时间戳（秒级或毫秒级）格式化为本地时间字符串，
 * 并计算相对于当前时间的描述。
 *
 * @param value - 时间戳值（数字类型）
 * @param texts - 相对时间文本配置（用于国际化），不传则使用中文默认值
 * @returns 格式化结果，若不是有效时间戳则返回 null
 */
export function formatTimestamp(
  value: unknown,
  texts?: Partial<RelativeTimeTexts>
): TimestampFormatResult | null {
  if (typeof value !== "number") return null;

  // JWT 标准使用秒级时间戳，也兼容毫秒级
  const ms = value > 1e12 ? value : value * 1000;
  const date = new Date(ms);
  if (isNaN(date.getTime())) return null;

  // 使用 sv-SE 区域格式生成 "YYYY-MM-DD HH:MM:SS" 格式
  const formatted = date.toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(",", "");

  // 合并默认文本与传入的覆盖文本
  const t = { ...DEFAULT_RELATIVE_TIME_TEXTS, ...texts };

  // 计算相对时间
  const now = Date.now();
  const diff = ms - now;
  const absDiff = Math.abs(diff);

  /** 替换模板中的 {n} 占位符 */
  const replaceN = (tmpl: string, n: number) => tmpl.replace("{n}", String(n));

  let relative: string;

  if (absDiff < 60 * 1000) {
    relative = diff > 0 ? t.upcoming : t.justPast;
  } else if (absDiff < 3600 * 1000) {
    const mins = Math.floor(absDiff / (60 * 1000));
    relative = diff > 0 ? replaceN(t.minutesLater, mins) : replaceN(t.minutesAgo, mins);
  } else if (absDiff < 86400 * 1000) {
    const hours = Math.floor(absDiff / (3600 * 1000));
    relative = diff > 0 ? replaceN(t.hoursLater, hours) : replaceN(t.hoursAgo, hours);
  } else {
    const days = Math.floor(absDiff / (86400 * 1000));
    relative = diff > 0 ? replaceN(t.daysLater, days) : replaceN(t.daysAgo, days);
  }

  return { formatted, relative };
}

/**
 * 判断给定的 key 是否为 JWT 中常见的时间戳字段
 *
 * @param key - JWT payload 中的字段名
 * @returns 是否为时间戳字段（exp/iat/nbf/auth_time）
 */
export function isTimestampKey(key: string): boolean {
  return TIMESTAMP_KEYS.includes(key);
}
