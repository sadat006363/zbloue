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

// ============================================================
// 🔥 تبدیل AdvancedAuditResult به SnippetInsert
// ============================================================

export function toSnippetInsert(
  audit: AdvancedAuditResult,
  context: SnippetCreationContext
): SnippetInsert {
  const now = new Date().toISOString();

  const row: SnippetInsert = {
    slug: context.slug,
    raw_code: context.rawCode,
    language: context.sourceLanguage,

    card_title: audit.summary?.slice(0, 100) || 'Code Analysis',
    key_concept: audit.summary?.slice(0, 2000) || '',
    what_this_code_does: audit.executionOverview?.entryPoints?.join(', ') || '',
    debug_analysis: audit.findings?.length ? `${audit.findings.length} findings` : '-',
    optimization: audit.recommendedActions?.length
      ? audit.recommendedActions.map((a) => a.title).join('; ')
      : '-',
    linkedin_post: audit.linkedin_post || 'Check out this code analysis! #Zbloue',

    username: context.username ?? null,
    github_username: context.githubUsername ?? null,
    avatar_url: context.avatarUrl ?? null,
    user_id: context.userId ?? null,
    is_public: context.isPublic ?? true,

    created_at: now,
    schema_version: '1.0',

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

    findings: (audit.findings || null) as any,
    execution_overview: (audit.executionOverview || null) as any,
    architectural_observations: (audit.architecturalObservations || null) as any,
    recommended_actions: (audit.recommendedActions || null) as any,
    suggested_tests_new: (audit.suggestedTests || null) as any,
    complexity: (audit.complexity || null) as any,
    scorecard_new: (audit.scorecard || null) as any,
    verdict: (audit.verdict || null) as any,
    limitations: (audit.limitations || null) as any,

    audit_result: audit as any,
  };

  return row;
}

// ============================================================
// 🔥 تبدیل Snippet از دیتابیس به AdvancedAuditResult
// ============================================================

export function snippetRowToAudit(row: SnippetRow): AdvancedAuditResult | null {
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

  return legacyRowToAudit(row);
}

// ============================================================
// 🔥 تبدیل Legacy به Canonical (اصلاح‌شده)
// ============================================================

export function legacyRowToAudit(row: SnippetRow | any): AdvancedAuditResult | null {
  try {
    const hasConcurrency = row.execution_overview && 
      (row.execution_overview.entryPoints?.length > 0 ||
       row.execution_overview.taskSubmissionPoints?.length > 0 ||
       row.execution_overview.blockingWaitPoints?.length > 0);

    // ============================================================
    // 1️⃣ نرمالایز کردن responseLanguage
    // ============================================================
    let responseLanguage: 'English' | 'Persian' | null = 'English';
    if (row.responseLanguage === 'English' || row.responseLanguage === 'Persian') {
      responseLanguage = row.responseLanguage;
    } else {
      responseLanguage = 'English';
    }

    // ============================================================
    // 2️⃣ نرمالایز کردن complexity
    // ============================================================
    let complexity = row.complexity || {};
    if (typeof complexity.applicable !== 'boolean') {
      complexity = {
        applicable: false,
        expression: null,
        explanation: null,
        variables: [],
        assumptions: [],
      };
    }

    // ============================================================
    // 3️⃣ نرمالایز کردن scorecard
    // ============================================================
    let scorecard: any = row.scorecard_new || row.scorecard || null;
    if (!scorecard || typeof scorecard !== 'object') {
      scorecard = {
        correctness: { applicable: false, score: null, reason: 'No data', relatedFindings: [] },
        concurrencySafety: { applicable: false, score: null, reason: 'No data', relatedFindings: [] },
        liveness: { applicable: false, score: null, reason: 'No data', relatedFindings: [] },
        errorHandling: { applicable: false, score: null, reason: 'No data', relatedFindings: [] },
        resourceManagement: { applicable: false, score: null, reason: 'No data', relatedFindings: [] },
        maintainability: { applicable: false, score: null, reason: 'No data', relatedFindings: [] },
        productionReadiness: { applicable: false, score: null, reason: 'No data', relatedFindings: [] },
      };
    }

    // ============================================================
    // 4️⃣ improvedCode
    // ============================================================
    let improvedCode: any;
    if (row.improved_code_jsonb) {
      improvedCode = row.improved_code_jsonb;
    } else if (row.improved_code) {
      improvedCode = {
        available: true,
        code: row.improved_code,
        notes: 'Migrated from legacy improved_code column',
      };
    } else {
      improvedCode = {
        available: false,
        code: null,
        notes: 'No improved code available in legacy data',
      };
    }

    // ============================================================
    // 5️⃣ verdict
    // ============================================================
    let verdict: any;
    if (row.verdict) {
      verdict = row.verdict;
    } else if (row.final_verdict_approved !== undefined && row.final_verdict_approved !== null) {
      verdict = {
        status: row.final_verdict_approved ? 'approved' : 'requires-changes',
        explanation: row.final_verdict_summary || 'Legacy verdict',
      };
    } else {
      verdict = {
        status: 'requires-changes',
        explanation: 'Legacy record without verdict data',
      };
    }

    // ============================================================
    // 6️⃣ analysisCoverage (با اصلاح TypeScript)
    // ============================================================
    const coverageDimensions = [
      'correctness',
      'security',
      'concurrency',
      'liveness',
      'performance',
      'resource-management',
      'error-handling',
      'input-validation',
      'data-integrity',
      'api-design',
      'architecture',
      'maintainability',
      'testability',
      'observability',
      'compatibility',
    ] as const;

    type CoverageDimension = typeof coverageDimensions[number];

    // 🔥 اصلاح: استفاده از as const برای literal type status
    const analysisCoverage = coverageDimensions.map((dim) => ({
      dimension: dim as CoverageDimension,
      status: (dim === 'concurrency' && !hasConcurrency ? 'not-applicable' : 'analyzed') as const,
      summary: `Analysis of ${dim} dimension.`,
      limitation: null,
    }));

    // ============================================================
    // 7️⃣ ساخت Audit نهایی با مقادیر نرمالایز‌شده
    // ============================================================
    const audit: Partial<AdvancedAuditResult> = {
      schemaVersion: '1.0',
      auditType: 'comprehensive',
      appliedSpecializations: hasConcurrency ? ['concurrency'] : [],
      completionStatus: 'complete',
      repairApplied: false,
      language: row.language || 'unknown',
      responseLanguage: responseLanguage,
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
      complexity: complexity,
      limitations: row.limitations || [],
      linkedin_post: row.linkedin_post || '',
      scorecard: scorecard,
      verdict: verdict,
      improvedCode: improvedCode,
      analysisCoverage: analysisCoverage, // ✅ خطا برطرف شد
      title: row.card_title || 'Code Analysis Report',
    };

    // ============================================================
    // 8️⃣ اعتبارسنجی نهایی با Zod Schema کانونیکال
    // ============================================================
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

// ============================================================
// 🔥 اعتبارسنجی Context ورودی
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