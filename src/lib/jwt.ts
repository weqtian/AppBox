export interface JwtResult {
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string | null;
  isValid: boolean;
  error?: string;
  /** 自动剥离的前缀（如 "Bearer"），未剥离时为 undefined */
  strippedPrefix?: string;
}

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

const PREFIX_RE = new RegExp(
  `^(?:${AUTH_PREFIXES.map((p) => p.toLowerCase()).join("|")})[\\s=]+`,
  "i"
);

/**
 * 剥离 JWT 字符串中可能存在的前缀（如 "Bearer "、"Token "），
 * 同时去除首尾空白和不可见字符。
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

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

export function decodeJwt(raw: string): JwtResult {
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
      error: "JWT 格式无效，必须包含两个「.」分隔符",
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
      error: "解析失败: " + message,
      strippedPrefix,
    };
  }
}

/** 时间戳字段列表（常见的 JWT 时间声明） */
const TIMESTAMP_KEYS = ["exp", "iat", "nbf", "auth_time"];

/**
 * 格式化时间戳字段为本地时间字符串
 * 返回 null 表示该值不是有效时间戳
 */
export function formatTimestamp(
  value: unknown
): { formatted: string; relative?: string } | null {
  if (typeof value !== "number") return null;
  // 时间戳可能是秒级（JWT 标准）或毫秒级
  const ms = value > 1e12 ? value : value * 1000;
  const date = new Date(ms);
  if (isNaN(date.getTime())) return null;

  const formatted = date.toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(",", "");

  // 计算相对时间
  const now = Date.now();
  const diff = ms - now;
  const absDiff = Math.abs(diff);
  let relative: string | undefined;

  if (absDiff < 60 * 1000) {
    relative = diff > 0 ? "即将到来" : "刚刚过去";
  } else if (absDiff < 3600 * 1000) {
    const mins = Math.floor(absDiff / (60 * 1000));
    relative = diff > 0 ? `${mins} 分钟后` : `${mins} 分钟前`;
  } else if (absDiff < 86400 * 1000) {
    const hours = Math.floor(absDiff / (3600 * 1000));
    relative = diff > 0 ? `${hours} 小时后` : `${hours} 小时前`;
  } else {
    const days = Math.floor(absDiff / (86400 * 1000));
    relative = diff > 0 ? `${days} 天后` : `${days} 天前`;
  }

  return { formatted, relative };
}

export function isTimestampKey(key: string): boolean {
  return TIMESTAMP_KEYS.includes(key);
}
