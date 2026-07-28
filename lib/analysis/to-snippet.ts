// lib/analysis/to-snippet.ts

import { AdvancedAuditResult, AdvancedAuditResultSchema } from './schema';
import type { Database } from '@/types/supabase';

type SnippetInsert = Database['public']['Tables']['snippets']['Insert'];

export interface SnippetCreationContext {
  rawCode: string;
  sourceLanguage: string;
  slug: string;
  userId?: string;
  username?: string | null;
  githubUsername?: string | null;
  avatarUrl?: string | null;
  isPublic?: boolean;
}

// ============================================================
// 🔥 تبدیل AdvancedAuditResult به SnippetInsert
// فقط ستون‌هایی که در دیتابیس وجود دارند
// ============================================================

export function toSnippetInsert(
  audit: AdvancedAuditResult,
  context: SnippetCreationContext
): SnippetInsert {
  const now = new Date().toISOString();

  // ============================================================
  // 🔥 فقط ستون‌هایی که در دیتابیس وجود دارند
  // ============================================================
  const row = {
    // ===== شناسه و پاکت‌نامه =====
    slug: context.slug,
    raw_code: context.rawCode,
    language: context.sourceLanguage,
    is_public: context.isPublic ?? true,
    created_at: now,

    // ===== اطلاعات کاربر =====
    username: context.username ?? null,
    github_username: context.githubUsername ?? null,
    avatar_url: context.avatarUrl ?? null,
    user_id: context.userId ?? null,

    // ===== داده‌های تحلیلی =====
    audit_result: audit as any,

    // ===== فیلدهای جانبی =====
    // 🔥 line_explanations و generated_prompt حذف شدند
    // چون در دیتابیس وجود ندارند
  } as SnippetInsert;

  return row;
}

// ============================================================
// 🔥 اعتبارسنجی Context
// ============================================================

export function isValidSnippetContext(context: SnippetCreationContext): boolean {
  if (!context.rawCode || context.rawCode.trim().length === 0) {
    throw new Error('rawCode is required and must not be empty');
  }
  if (!context.sourceLanguage || context.sourceLanguage.trim().length === 0) {
    throw new Error('sourceLanguage is required and must not be empty');
  }
  if (!context.slug || context.slug.trim().length === 0) {
    throw new Error('slug is required and must not be empty');
  }
  return true;
}