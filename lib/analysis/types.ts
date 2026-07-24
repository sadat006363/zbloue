// lib/analysis/types.ts

// ============================================================
// 🔥 تایپ‌های کانونیکال (مستقیماً از schema.ts)
// ============================================================

export type {
  // تایپ‌های اصلی خروجی تحلیل
  AdvancedAuditResult,
  Severity,
  Confidence,
  FindingCategory,
  EvidenceItem,
  AuditFinding,
  AuditScorecard,
  ImprovedCode,
  RecommendedAction,
  ScoreItem,
  VerdictStatus,
  Complexity,
  AnalysisCoverageItem,
  ArchitecturalObservation,
  SuggestedTest,
  ExecutionOverview,
} from './schema';

// ============================================================
// 🔥 تایپ‌های کمکی (مختص به فرآیند تحلیل و اعتبارسنجی)
// ============================================================

/**
 * یک خطای اعتبارسنجی معنایی (Semantic Validation)
 * این تایپ برای گزارش خطاهای فراتر از Zod استفاده می‌شود
 */
export interface ValidationIssue {
  /** کد خطا برای شناسایی */
  code: string;
  /** شدت خطا */
  severity: 'error' | 'warning';
  /** پیام توضیحی */
  message: string;
  /** خطوط مرتبط (در کد منبع) – در صورت عدم کاربرد می‌تواند خالی باشد */
  relatedLines: number[];
  /** پوشش مورد انتظار – فقط برای خطاهای مرتبط با پوشش (اختیاری) */
  expectedCoverage?: string;
}

/**
 * نتیجه اعتبارسنجی معنایی کل ساختار
 */
export interface AuditValidationResult {
  /** آیا ساختار از نظر Zod معتبر است؟ */
  structurallyValid: boolean;
  /** آیا از نظر معنایی کامل است؟ */
  semanticallyComplete: boolean;
  /** لیست مشکلات شناسایی‌شده */
  issues: ValidationIssue[];
  /** آیا نیاز به تعمیر (Repair) دارد؟ */
  repairRequired: boolean;
}

/**
 * یک سیگنال شناسایی‌شده توسط Detector.
 * جزئیات دقیق مقادیر `type`، `value` و فرمول `score`
 * باید با پیاده‌سازی `lib/analysis/detector.ts` هماهنگ شود.
 */
export interface DetectorSignal {
  /** شناسه نوع سیگنال (مقدار وابسته به پیاده‌سازی Detector) */
  type: string;
  /** مقدار یا متن مرتبط با سیگنال */
  value: string;
  /** شماره خط مرتبط در کد منبع */
  line: number;
  /** وزن اختصاص‌یافته به سیگنال توسط Detector */
  weight: number;
}

/**
 * نتیجه Detector برای تصمیم‌گیری Pipeline.
 * فیلد `score` و منطق `requiresConcurrencyAudit` باید با پیاده‌سازی Detector تطابق داشته باشد.
 */
export interface DetectorResult {
  /**
   * نام Legacy موقت.
   * تغییر نام این فیلد باید همراه با Detector، Pipeline و تمام مصرف‌کنندگان انجام شود.
   */
  requiresConcurrencyAudit: boolean;
  /** امتیاز محاسبه‌شده توسط Detector (وابسته به پیاده‌سازی) */
  score: number;
  /** لیست سیگنال‌های شناسایی‌شده */
  signals: DetectorSignal[];
}