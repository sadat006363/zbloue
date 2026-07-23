// lib/analysis/parse-model-output.ts

import { z } from 'zod';
import logger from '@/lib/logger';

/**
 * نتیجه Parse کردن پاسخ مدل
 */
export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: ParseError;
  rawContent: string;
  extractedJson?: string;
}

/**
 * خطاهای Parse
 */
export interface ParseError {
  code: 'NO_JSON_FOUND' | 'JSON_PARSE_ERROR' | 'SCHEMA_VALIDATION_FAILED' | 'EMPTY_RESPONSE';
  message: string;
  details?: unknown;
}

/**
 * استخراج JSON از پاسخ مدل
 * - ابتدا سعی می‌کند کل پاسخ را به عنوان JSON parse کند
 * - در غیر این صورت، اولین `{` تا آخرین `}` را استخراج می‌کند
 * - اگر هیچ JSONی پیدا نشود، خطا برمی‌گرداند
 */
export function extractJSONFromResponse(rawContent: string): { success: boolean; json?: string; error?: string } {
  if (!rawContent || rawContent.trim().length === 0) {
    return { success: false, error: 'Empty response' };
  }

  const trimmed = rawContent.trim();

  // 1. سعی می‌کنیم کل پاسخ را parse کنیم
  try {
    JSON.parse(trimmed);
    return { success: true, json: trimmed };
  } catch {
    // ادامه به مرحله بعد
  }

  // 2. استخراج با regex (اولین { تا آخرین })
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return { success: false, error: 'No JSON object found in response' };
  }

  const candidate = trimmed.substring(start, end + 1);

  try {
    JSON.parse(candidate);
    return { success: true, json: candidate };
  } catch {
    // 3. پاکسازی کاراکترهای کنترل
    const cleaned = candidate.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    try {
      JSON.parse(cleaned);
      return { success: true, json: cleaned };
    } catch {
      return { success: false, error: 'Failed to parse extracted JSON' };
    }
  }
}

/**
 * Parse کردن پاسخ مدل با اعتبارسنجی Zod
 */
export function parseModelOutput<T>(
  rawContent: string,
  schema: z.ZodSchema<T>,
  options?: {
    /**
     * آیا در صورت شکست، لاگ خطا ثبت شود؟
     * @default true
     */
    logErrors?: boolean;
    /**
     * شناسه درخواست برای لاگ‌گیری
     */
    requestId?: string;
  }
): ParseResult<T> {
  const { logErrors = true, requestId = 'unknown' } = options || {};

  // 1. استخراج JSON
  const extraction = extractJSONFromResponse(rawContent);
  if (!extraction.success) {
    const error: ParseError = {
      code: 'NO_JSON_FOUND',
      message: extraction.error || 'No JSON found in model response',
    };
    if (logErrors) {
      logger.warn('[ParseModelOutput] JSON extraction failed', {
        requestId,
        error: error.message,
        rawPreview: rawContent.slice(0, 200),
      });
    }
    return {
      success: false,
      error,
      rawContent,
    };
  }

  // 2. Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(extraction.json);
  } catch (parseError) {
    const error: ParseError = {
      code: 'JSON_PARSE_ERROR',
      message: 'Failed to parse JSON',
      details: parseError instanceof Error ? parseError.message : String(parseError),
    };
    if (logErrors) {
      logger.error('[ParseModelOutput] JSON parse failed', {
        requestId,
        error: error.message,
        jsonPreview: extraction.json.slice(0, 500),
      });
    }
    return {
      success: false,
      error,
      rawContent,
      extractedJson: extraction.json,
    };
  }

  // 3. اعتبارسنجی با Zod
  const validation = schema.safeParse(parsed);
  if (!validation.success) {
    const error: ParseError = {
      code: 'SCHEMA_VALIDATION_FAILED',
      message: 'Schema validation failed',
      details: validation.error.issues,
    };
    if (logErrors) {
      logger.error('[ParseModelOutput] Zod validation failed', {
        requestId,
        issues: validation.error.issues,
        jsonPreview: extraction.json.slice(0, 500),
      });
    }
    return {
      success: false,
      error,
      rawContent,
      extractedJson: extraction.json,
    };
  }

  return {
    success: true,
    data: validation.data,
    rawContent,
    extractedJson: extraction.json,
  };
}

/**
 * Parse کردن پاسخ مدل با لاگ‌گیری خودکار و timeout
 */
export async function parseModelOutputWithRetry<T>(
  rawContent: string,
  schema: z.ZodSchema<T>,
  options?: {
    maxRetries?: number;
    requestId?: string;
  }
): Promise<ParseResult<T>> {
  const { maxRetries = 1, requestId = 'unknown' } = options || {};

  let currentContent = rawContent;
  let lastResult: ParseResult<T> | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = parseModelOutput(currentContent, schema, {
      logErrors: attempt === maxRetries,
      requestId,
    });

    if (result.success) {
      return result;
    }

    lastResult = result;

    // در صورت وجود JSON ناقص، ممکن است بخواهیم یک بار تلاش به تعمیر کنیم
    if (attempt < maxRetries && result.extractedJson) {
      // می‌توانیم یک تلاش تعمیر ساده اضافه کنیم
      // فعلاً فقط لاگ می‌کنیم
      logger.debug('[ParseModelOutput] Retry attempt', { attempt, requestId });
      // در اینجا می‌توانیم JSON را با regex تعمیر کنیم (برای آینده)
    }

    // اگر نتیجه موفق نبود و دیگر تلاشی وجود ندارد، خطا را برگردان
    if (attempt === maxRetries) {
      return result;
    }
  }

  return lastResult || {
    success: false,
    error: {
      code: 'UNKNOWN',
      message: 'All parse attempts failed',
    },
    rawContent: currentContent,
  };
}