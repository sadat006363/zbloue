// lib/analysis/prompt-context.ts

/**
 * زبان‌های پشتیبانی‌شده برای پاسخ (توسط مدل)
 */
export const RESPONSE_LANGUAGES = ['English', 'Persian'] as const;
export type ResponseLanguage = (typeof RESPONSE_LANGUAGES)[number];

/**
 * زبان‌های پشتیبانی‌شده برای کد منبع (برنامه‌نویسی)
 * این لیست باید با SUPPORTED_LANGUAGES در constants.ts هماهنگ باشد
 */
export type SourceLanguage = string;

/**
 * تنظیمات پرامپت برای ساختاردهی ورودی‌ها
 */
export interface PromptContext {
  /**
   * زبان برنامه‌نویسی کد منبع (مثلاً 'javascript', 'python', 'java')
   */
  sourceLanguage: SourceLanguage;

  /**
   * زبانی که توضیحات و فیلدهای متنی توسط مدل تولید شوند
   * - 'English': تمام خروجی‌های متنی به انگلیسی
   * - 'Persian': تمام خروجی‌های متنی به فارسی
   */
  responseLanguage: ResponseLanguage;

  /**
   * کد منبع شماره‌گذاری‌شده (برای ارسال به مدل)
   */
  numberedCode: string;

  /**
   * کد منبع خام (برای اعتبارسنجی)
   */
  rawCode: string;
}

/**
 * اعتبارسنجی زبان پاسخ
 */
export function isValidResponseLanguage(value: unknown): value is ResponseLanguage {
  return typeof value === 'string' && RESPONSE_LANGUAGES.includes(value as ResponseLanguage);
}

/**
 * دریافت زبان پاسخ ایمن (با fallback)
 */
export function getSafeResponseLanguage(value: unknown): ResponseLanguage {
  if (isValidResponseLanguage(value)) {
    return value;
  }
  return 'English'; // پیش‌فرض ایمن
}

/**
 * سریال‌سازی ایمن داده‌های untrusted برای قرارگیری در پرامپت
 * تمام کاراکترهای حساس را به Unicode Escape تبدیل می‌کند
 */
export function serializeUntrustedData(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError('serializeUntrustedData expects a string');
  }

  return JSON.stringify(value)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/"/g, '\\u0022')
    .replace(/'/g, '\\u0027');
}

/**
 * ساخت payload امن برای ارسال به مدل
 * تمام بخش‌های متغیر را JSON-encode می‌کند تا از Prompt Injection جلوگیری شود
 */
export function buildSafePromptPayload(context: PromptContext): {
  serializedCode: string;
  serializedSourceLanguage: string;
  serializedResponseLanguage: string;
} {
  return {
    serializedCode: serializeUntrustedData(context.numberedCode),
    serializedSourceLanguage: JSON.stringify(context.sourceLanguage),
    serializedResponseLanguage: JSON.stringify(context.responseLanguage),
  };
}

/**
 * ساخت بخش داده‌های untrusted برای قرارگیری در پرامپت
 * با تگ مشخص و JSON-encoded
 */
export function buildUntrustedDataSection(
  label: string,
  data: unknown,
  encoding: 'json' | 'plain' = 'json'
): string {
  if (encoding === 'json') {
    const serialized = serializeUntrustedData(
      typeof data === 'string' ? data : JSON.stringify(data)
    );
    return `<untrusted-data-${label}>\n${serialized}\n</untrusted-data-${label}>`;
  }

  // حالت plain (فقط برای مواقع ضروری)
  const safeData = typeof data === 'string' ? data : JSON.stringify(data);
  return `<untrusted-data-${label}>\n${safeData}\n</untrusted-data-${label}>`;
}

/**
 * بررسی اینکه آیا یک رشته حاوی دستورات مخرب (Prompt Injection) است یا خیر
 * برای تست‌های امنیتی
 */
export function containsSuspiciousInstructions(text: string): boolean {
  const suspiciousPatterns = [
    /ignore (previous|all) instructions/i,
    /do not follow/i,
    /you are (now|no longer)/i,
    /pretend (you are|to be)/i,
    /as an ai/i,
    /system prompt/i,
    /output.*different schema/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(text));
}