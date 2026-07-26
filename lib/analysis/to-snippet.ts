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

  // 🔥 استفاده از as SnippetInsert برای bypass کردن TypeScript
  const row = {
    // ===== Primary keys =====
    slug: context.slug,
    raw_code: context.rawCode,
    language: context.sourceLanguage,

    // ===== User metadata =====
    username: context.username ?? null,
    github_username: context.githubUsername ?? null,
    avatar_url: context.avatarUrl ?? null,
    user_id: context.userId ?? null,
    is_public: context.isPublic ?? true,
    created_at: now,

    // ===== 🔥 فقط audit_result =====
    // تمام داده‌های تحلیلی فقط در اینجا ذخیره می‌شوند
    audit_result: audit as any,

    // ===== فیلدهای Legacy - همه nullable هستند =====
    card_title: null,
    key_concept: null,
    what_this_code_does: null,
    debug_analysis: null,
    optimization: null,
    linkedin_post: null,

    // Legacy fields - all null
    code_walkthrough: null,
    what_works_well: null,
    bugs_and_risky_cases: null,
    edge_cases: null,
    performance_analysis: null,
    security_analysis: null,
    production_readiness: null,
    recommended_improvements: null,
    improved_code: null,
    suggested_tests: null,
    scorecard: null,
    final_verdict_summary: null,
    final_verdict_approved: null,
    final_verdict_next_steps: null,

    // Advanced fields - all null (data in audit_result)
    findings: null,
    execution_overview: null,
    architectural_observations: null,
    recommended_actions: null,
    suggested_tests_new: null,
    complexity: null,
    scorecard_new: null,
    verdict: null,
    limitations: null,
    debug_trace: null,
  } as SnippetInsert;

  return row;
}

// ============================================================
// 🔥 تبدیل Snippet از دیتابیس به AdvancedAuditResult
// ============================================================

export function snippetRowToAudit(row: any): AdvancedAuditResult | null {
  // اولویت اول: audit_result
  if (row.audit_result) {
    try {
      let data = row.audit_result;
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      const validation = AdvancedAuditResultSchema.safeParse(data);
      if (validation.success) {
        return validation.data;
      }
    } catch (error) {
      console.warn('[toSnippet] Failed to parse audit_result:', error);
    }
  }

  // Fallback: ساخت از فیلدهای Legacy
  return legacyRowToAudit(row);
}

// ============================================================
// 🔥 تبدیل Legacy به Canonical (برای داده‌های قدیمی)
// ============================================================

export function legacyRowToAudit(row: any): AdvancedAuditResult | null {
  try {
    const hasConcurrency = row.execution_overview && 
      (row.execution_overview.entryPoints?.length > 0 ||
       row.execution_overview.taskSubmissionPoints?.length > 0 ||
       row.execution_overview.blockingWaitPoints?.length > 0);

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

    let scorecard: any = row.scorecard_new || row.scorecard || null;
    if (!scorecard || typeof scorecard !== 'object') {
      scorecard = {
        correctness: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] },
        concurrencySafety: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] },
        liveness: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] },
        errorHandling: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] },
        resourceManagement: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] },
        maintainability: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] },
        productionReadiness: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] },
      };
    }

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

    const analysisCoverage = coverageDimensions.map((dim) => ({
      dimension: dim as CoverageDimension,
      status: (dim === 'concurrency' && !hasConcurrency ? 'not-applicable' : 'analyzed') as 'analyzed' | 'not-applicable',
      summary: `Analysis of ${dim} dimension.`,
      limitation: null,
    }));

    const audit: Partial<AdvancedAuditResult> = {
      schemaVersion: '1.0.0',
      auditType: 'comprehensive',
      appliedSpecializations: hasConcurrency ? ['concurrency'] : [],
      completionStatus: 'complete',
      repairApplied: false,
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
      complexity: complexity,
      limitations: row.limitations || [],
      linkedinPost: row.linkedin_post || 'Check out this code analysis! #Zbloue',
      scorecard: scorecard,
      verdict: verdict,
      improvedCode: improvedCode,
      analysisCoverage: analysisCoverage,
      title: row.card_title || 'Code Analysis Report',
    };

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