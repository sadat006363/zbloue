// lib/analysis/to-snippet.ts

import { AdvancedAuditResult, AdvancedAuditResultSchema } from './schema';
import type { Database } from '@/types/supabase';

type SnippetInsert = Database['public']['Tables']['snippets']['Insert'];
type SnippetRow = Database['public']['Tables']['snippets']['Row'];

/**
 * زمینه مورد نیاز برای ایجاد یک Snippet از Audit
 */
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

/**
 * تبدیل AdvancedAuditResult به SnippetInsert
 * با پشتیبانی کامل از audit_result
 */
export function toSnippetInsert(
  audit: AdvancedAuditResult,
  context: SnippetCreationContext
): SnippetInsert {
  const now = new Date().toISOString();

  // ===== فیلدهای اصلی =====
  const row: SnippetInsert = {
    slug: context.slug,
    raw_code: context.rawCode,
    language: context.sourceLanguage,

    // ===== فیلدهای اجباری Legacy =====
    card_title: audit.summary?.slice(0, 100) || 'Code Analysis',
    key_concept: audit.summary?.slice(0, 2000) || '',
    what_this_code_does: audit.executionOverview?.entryPoints?.join(', ') || '',
    debug_analysis: audit.findings?.length ? `${audit.findings.length} findings` : '-',
    optimization: audit.recommendedActions?.length
      ? audit.recommendedActions.map((a) => a.title).join('; ')
      : '-',
    linkedin_post: 'Check out this code analysis! #Zbloue', // مقدار ثابت چون در audit وجود ندارد

    // ===== فیلدهای کاربر =====
    username: context.username ?? null,
    github_username: context.githubUsername ?? null,
    avatar_url: context.avatarUrl ?? null,
    user_id: context.userId ?? null,
    is_public: context.isPublic ?? true,

    created_at: now,

    // ===== فیلدهای Legacy (برای سازگاری) =====
    code_walkthrough: null,
    what_works_well: null,
    bugs_and_risky_cases: null,
    edge_cases: null,
    performance_analysis: null,
    security_analysis: null,
    production_readiness: null,
    recommended_improvements: null,
    improved_code: audit.improvedCode?.available ? audit.improvedCode.code : null,
    suggested_tests: null,
    scorecard: null,
    final_verdict_summary: audit.verdict?.explanation || null,
    final_verdict_approved: audit.verdict?.status === 'approved',
    final_verdict_next_steps: null,

    // ===== فیلدهای Advanced (JSONB) =====
    // کستینگ به any جهت جلوگیری از خطای ناسازگاری ساختار با نوع جنریک Json در Supabase types
    findings: (audit.findings || null) as any,
    execution_overview: (audit.executionOverview || null) as any,
    architectural_observations: (audit.architecturalObservations || null) as any,
    recommended_actions: (audit.recommendedActions || null) as any,
    suggested_tests_new: (audit.suggestedTests || null) as any,
    complexity: (audit.complexity || null) as any,
    scorecard_new: (audit.scorecard || null) as any,
    verdict: (audit.verdict || null) as any,
    limitations: (audit.limitations || null) as any,

    // ===== ذخیره خروجی کامل Audit به عنوان منبع حقیقت =====
    audit_result: audit as any,
  };

  return row;
}

/**
 * تبدیل ردیف Snippet از دیتابیس به AdvancedAuditResult
 * با پشتیبانی از audit_result و Legacy
 */
export function snippetRowToAudit(row: SnippetRow): AdvancedAuditResult | null {
  // ===== 1. اگر audit_result موجود است =====
  if (row.audit_result) {
    try {
      let data = row.audit_result;
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      const validation = AdvancedAuditResultSchema.safeParse(data);
      if (validation.success) {
        return validation.data;
      } else {
        console.warn('[toSnippet] audit_result validation failed:', validation.error.format());
      }
    } catch (error) {
      console.warn('[toSnippet] Failed to parse audit_result:', error);
    }
  }

  // ===== 2. Fallback به Legacy =====
  return legacyRowToAudit(row);
}

/**
 * تبدیل Legacy Snippet به AdvancedAuditResult
 */
export function legacyRowToAudit(row: SnippetRow | any): AdvancedAuditResult | null {
  try {
    const audit: Partial<AdvancedAuditResult> = {
      schemaVersion: '1.0',
      auditType: row.execution_overview ? 'concurrency' : 'generic',
      status: 'complete',
      language: row.language || 'unknown',
      summary: row.key_concept || '',
      executionOverview: row.execution_overview || { 
        entryPoints: [], 
        taskSubmissionPoints: [], 
        blockingWaitPoints: [], 
        sharedResources: [], 
        resourceLifecycle: [] 
      },
      findings: row.findings || [],
      architecturalObservations: row.architectural_observations || [],
      recommendedActions: row.recommended_actions || [],
      suggestedTests: row.suggested_tests_new || [],
      complexity: row.complexity || { 
        time: 'unknown', 
        space: 'unknown', 
        resourceGrowth: 'unknown', 
        assumptions: [] 
      },
      limitations: row.limitations || [],
      linkedin_post: '', // فیلد اجباری در schema اما در Legacy وجود ندارد
    };

    // ===== improvedCode =====
    if (row.improved_code_jsonb) {
      audit.improvedCode = row.improved_code_jsonb;
    } else if (row.improved_code) {
      audit.improvedCode = {
        available: true,
        code: row.improved_code,
        notes: 'Migrated from legacy improved_code column',
      };
    } else {
      audit.improvedCode = {
        available: false,
        code: null,
        notes: 'No improved code available in legacy data',
      };
    }

    // ===== scorecard =====
    if (row.scorecard_new) {
      audit.scorecard = row.scorecard_new;
    } else if (row.scorecard) {
      const legacy = row.scorecard as {
        correctness?: number;
        readability?: number;
        performance?: number;
        maintainability?: number;
        productionReadiness?: number;
        security?: number;
        overall?: number;
      };
      
      // مپ کردن امتیازهای قدیمی (10-0) به مدل جدید (100-0) با فیلدهای واقعی Legacy
      audit.scorecard = {
        correctness: { 
          score: (legacy.correctness ?? 0) * 10, 
          reason: 'Migrated from legacy correctness', 
          relatedFindings: [] 
        },
        readability: { 
          score: (legacy.readability ?? 0) * 10, 
          reason: 'Migrated from legacy readability', 
          relatedFindings: [] 
        },
        performance: { 
          score: (legacy.performance ?? 0) * 10, 
          reason: 'Migrated from legacy performance', 
          relatedFindings: [] 
        },
        maintainability: { 
          score: (legacy.maintainability ?? 0) * 10, 
          reason: 'Migrated from legacy maintainability', 
          relatedFindings: [] 
        },
        productionReadiness: { 
          score: (legacy.productionReadiness ?? 0) * 10, 
          reason: 'Migrated from legacy productionReadiness', 
          relatedFindings: [] 
        },
        // فیلدهای جدید canonical با مقادیر پیش‌فرض
        concurrencySafety: { 
          score: (legacy.security ?? legacy.overall ?? 0) * 10, 
          reason: 'Default from legacy security/overall', 
          relatedFindings: [] 
        },
        liveness: { 
          score: (legacy.overall ?? 0) * 10, 
          reason: 'Default from legacy overall', 
          relatedFindings: [] 
        },
        errorHandling: { 
          score: (legacy.overall ?? 0) * 10, 
          reason: 'Default from legacy overall', 
          relatedFindings: [] 
        },
        resourceManagement: { 
          score: (legacy.overall ?? 0) * 10, 
          reason: 'Default from legacy overall', 
          relatedFindings: [] 
        }
      };
    }

    // ===== verdict =====
    if (row.verdict) {
      audit.verdict = row.verdict;
    } else if (row.final_verdict_approved !== undefined && row.final_verdict_approved !== null) {
      audit.verdict = {
        status: row.final_verdict_approved ? 'approved' : 'requires-changes',
        explanation: row.final_verdict_summary || 'Legacy verdict',
      };
    }

    // ===== اعتبارسنجی نهایی با Zod Schema کانونیکال =====
    const result = AdvancedAuditResultSchema.safeParse(audit);
    if (result.success) {
      return result.data;
    } else {
      console.error('[toSnippet] Schema mismatch during legacy parsing:', result.error.format());
      return null;
    }
  } catch (error) {
    console.error('[toSnippet] Failed to convert legacy row:', error);
    return null;
  }
}

/**
 * اعتبارسنجی Context ورودی
 */
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
