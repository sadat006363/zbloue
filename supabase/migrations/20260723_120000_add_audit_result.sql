-- ============================================================
-- 📁 فایل: supabase/migrations/XXXXXX_add_audit_result.sql
-- تاریخ: 2026-07-23
-- توضیح: اضافه کردن ستون‌های جدید برای پشتیبانی از Canonical Audit
-- ============================================================

-- ===== 1. اضافه کردن ستون audit_result =====
ALTER TABLE public.snippets
ADD COLUMN IF NOT EXISTS audit_result JSONB;

COMMENT ON COLUMN public.snippets.audit_result IS 'Canonical AdvancedAuditResult in JSONB format (schemaVersion 1.0)';

-- ===== 2. تبدیل improved_code به JSONB =====
-- 2.1. اضافه کردن ستون جدید improved_code_jsonb
ALTER TABLE public.snippets
ADD COLUMN IF NOT EXISTS improved_code_jsonb JSONB;

-- 2.2. Migrate داده‌های موجود از improved_code (text) به improved_code_jsonb
UPDATE public.snippets
SET improved_code_jsonb = jsonb_build_object(
  'available', CASE WHEN improved_code IS NOT NULL AND improved_code <> '' THEN true ELSE false END,
  'code', improved_code,
  'notes', 'Migrated from legacy improved_code column'
)
WHERE improved_code IS NOT NULL;

-- 2.3. (اختیاری) بعد از تأیید migration، می‌توان ستون قدیمی را حذف کرد
-- اما برای Backward Compatibility، فعلاً نگه می‌داریم
-- ALTER TABLE public.snippets DROP COLUMN improved_code;

-- ===== 3. اصلاح created_at =====
-- 3.1. Backfill مقادیر null
UPDATE public.snippets
SET created_at = now()
WHERE created_at IS NULL;

-- 3.2. تنظیم DEFAULT و NOT NULL
ALTER TABLE public.snippets
ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.snippets
ALTER COLUMN created_at SET NOT NULL;

-- ===== 4. اصلاح is_public =====
-- 4.1. Backfill مقادیر null
UPDATE public.snippets
SET is_public = false
WHERE is_public IS NULL;

-- 4.2. تنظیم DEFAULT و NOT NULL
ALTER TABLE public.snippets
ALTER COLUMN is_public SET DEFAULT false;

ALTER TABLE public.snippets
ALTER COLUMN is_public SET NOT NULL;

-- ===== 5. اصلاح linkedin_post (Check Constraint) =====
-- 5.1. حذف constraint قبلی (اگر وجود داشته باشد)
ALTER TABLE public.snippets
DROP CONSTRAINT IF EXISTS snippets_linkedin_post_length;

-- 5.2. اضافه کردن Check Constraint جدید
ALTER TABLE public.snippets
ADD CONSTRAINT snippets_linkedin_post_length
CHECK (
  char_length(trim(linkedin_post)) BETWEEN 1 AND 300
);

-- ===== 6. (اختیاری) افزودن Index برای بهبود عملکرد =====
CREATE INDEX IF NOT EXISTS idx_snippets_audit_result
ON public.snippets USING gin (audit_result);

CREATE INDEX IF NOT EXISTS idx_snippets_created_at
ON public.snippets (created_at DESC);

-- ===== 7. (اختیاری) افزودن ستون schema_version برای ردیابی نسخه =====
ALTER TABLE public.snippets
ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT '1.0';

COMMENT ON COLUMN public.snippets.schema_version IS 'Schema version of the audit_result';

-- ============================================================
-- 🔥 Rollback (در صورت نیاز)
-- ============================================================
-- BEGIN;
-- ALTER TABLE public.snippets DROP COLUMN IF EXISTS audit_result;
-- ALTER TABLE public.snippets DROP COLUMN IF EXISTS improved_code_jsonb;
-- ALTER TABLE public.snippets DROP COLUMN IF EXISTS schema_version;
-- ALTER TABLE public.snippets DROP CONSTRAINT IF EXISTS snippets_linkedin_post_length;
-- ALTER TABLE public.snippets ALTER COLUMN created_at DROP DEFAULT;
-- ALTER TABLE public.snippets ALTER COLUMN created_at DROP NOT NULL;
-- ALTER TABLE public.snippets ALTER COLUMN is_public DROP DEFAULT;
-- ALTER TABLE public.snippets ALTER COLUMN is_public DROP NOT NULL;
-- DROP INDEX IF EXISTS idx_snippets_audit_result;
-- DROP INDEX IF EXISTS idx_snippets_created_at;
-- COMMIT;