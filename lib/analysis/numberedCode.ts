// ============================================================
// 📁 فایل: lib/analysis/numberedCode.ts
// ============================================================

/**
 * شماره‌گذاری خطوط کد
 * @param code - کد ورودی
 * @returns کد با شماره خطوط
 */
export function addLineNumbers(code: string): string {
  return code
    .split('\n')
    .map((line, index) => `${index + 1}: ${line}`)
    .join('\n');
}

/**
 * تعداد خطوط کد
 * @param code - کد ورودی
 * @returns تعداد خطوط
 */
export function getLineCount(code: string): number {
  return code.split('\n').length;
}

/**
 * بررسی معتبر بودن محدوده خطوط
 * @param code - کد ورودی
 * @param start - خط شروع (یک‌ایندکس)
 * @param end - خط پایان (یک‌ایندکس)
 * @returns معتبر یا نامعتبر
 */
export function isValidLineRange(code: string, start: number, end: number): boolean {
  const total = getLineCount(code);
  return start >= 1 && end <= total && start <= end;
}

/**
 * دریافت محتوای یک محدوده خطوط
 * @param code - کد ورودی
 * @param start - خط شروع (یک‌ایندکس)
 * @param end - خط پایان (یک‌ایندکس)
 * @returns محتوای خطوط انتخاب‌شده
 */
export function getLineContent(code: string, start: number, end: number): string {
  const lines = code.split('\n');
  // start و end یک‌ایندکس هستند (خط اول = 1)
  const slice = lines.slice(start - 1, end);
  return slice.join('\n');
}

/**
 * دریافت یک خط خاص
 * @param code - کد ورودی
 * @param lineNumber - شماره خط (یک‌ایندکس)
 * @returns محتوای خط
 */
export function getLine(code: string, lineNumber: number): string {
  const lines = code.split('\n');
  if (lineNumber < 1 || lineNumber > lines.length) {
    return '';
  }
  return lines[lineNumber - 1];
}