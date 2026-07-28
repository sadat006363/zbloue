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
// ============================================================

export function toSnippetInsert(
  audit: AdvancedAuditResult,
  context: SnippetCreationContext
): SnippetInsert {
  const now = new Date().toISOString();

  return {
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

    // ===== فقط audit_result =====
    audit_result: audit as any,

    // ===== فیلدهای کمکی (برای نمایش) =====
    card_title: null,
    key_concept: null,
    what_this_code_does: null,
    linkedin_post: null,

    // ===== Line-by-line و Prompt =====
    line_explanations: null,
    generated_prompt: null,

    // ===== Legacy fields (همه null هستند) =====
    code_walkthrough: null,
    what_works_well: null,
    bugs_and_risky_cases: null,
    edge_cases: null,
    performance_analysis: null,
    security_analysis: null,
    production_readiness: null,
    recommended_improvements: null,
    improved_code: null,
    improved_code_jsonb: null,
    suggested_tests: null,
    scorecard: null,
    final_verdict_summary: null,
    final_verdict_approved: null,
    final_verdict_next_steps: null,

    schema_version: '1.0',
    card_image_url: null,
  } as SnippetInsert;
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