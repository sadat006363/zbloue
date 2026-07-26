// lib/analysis/normalize-snippet-audit.ts

import { AdvancedAuditResult, AdvancedAuditResultSchema } from './schema';
import { legacyRowToAudit } from './to-snippet';
import logger from '@/lib/logger';

export type StoredAuditStatus =
  | { type: 'valid'; audit: AdvancedAuditResult }
  | { type: 'legacy'; audit: Partial<AdvancedAuditResult> }
  | { type: 'unavailable' }
  | { type: 'invalid'; error: string };

export interface NormalizedSnippetAudit {
  status: StoredAuditStatus;
  hasFullAnalysis: boolean;
  findingsCount: number;
  verdictStatus?: string;
  overallScore?: number;
  linkedinPost?: string;
  summary?: string;
}

// ============================================================
// 🔥 Helper: normalize verdict to canonical
// ============================================================
function normalizeVerdictToCanonical(verdict: any): any {
  if (!verdict) return null;
  const canonStatuses = ['approved', 'approved-with-suggestions', 'requires-minor-changes', 'requires-changes', 'requires-major-changes', 'not-production-ready'];
  if (verdict.status && canonStatuses.includes(verdict.status)) {
    return verdict;
  }
  const statusMap: Record<string, string> = {
    'approved': 'approved',
    'requires-changes': 'requires-changes',
    'not-production-ready': 'not-production-ready',
  };
  const mappedStatus = statusMap[verdict.status] || 'requires-changes';
  return {
    status: mappedStatus,
    explanation: verdict.explanation || 'Legacy verdict',
  };
}

// ============================================================
// 🔥 Helper: normalize complexity to canonical
// ============================================================
function normalizeComplexityToCanonical(complexity: any): any {
  if (!complexity) return null;
  if ('applicable' in complexity) {
    return complexity;
  }
  return {
    applicable: true,
    expression: complexity.time || 'unknown',
    explanation: 'Migrated from legacy complexity',
    variables: [],
    assumptions: complexity.assumptions || [],
  };
}

// ============================================================
// 🔥 Helper: normalize scorecard to canonical
// ============================================================
function normalizeScorecardToCanonical(scorecard: any): any {
  if (!scorecard) return null;
  if (scorecard.correctness && typeof scorecard.correctness === 'object' && 'applicable' in scorecard.correctness) {
    return scorecard;
  }
  const legacy = scorecard;
  return {
    correctness: { applicable: true, score: (legacy.correctness || 0) * 10, reason: 'Migrated from legacy', relatedFindingIds: [] },
    concurrencySafety: { applicable: true, score: (legacy.security || 0) * 10, reason: 'Migrated from legacy', relatedFindingIds: [] },
    liveness: { applicable: true, score: (legacy.overall || 0) * 10, reason: 'Migrated from legacy', relatedFindingIds: [] },
    errorHandling: { applicable: true, score: (legacy.overall || 0) * 10, reason: 'Migrated from legacy', relatedFindingIds: [] },
    resourceManagement: { applicable: true, score: (legacy.overall || 0) * 10, reason: 'Migrated from legacy', relatedFindingIds: [] },
    maintainability: { applicable: true, score: (legacy.maintainability || 0) * 10, reason: 'Migrated from legacy', relatedFindingIds: [] },
    productionReadiness: { applicable: true, score: (legacy.productionReadiness || 0) * 10, reason: 'Migrated from legacy', relatedFindingIds: [] },
  };
}

// ============================================================
// 🔥 Main normalization function
// ============================================================
export function normalizeSnippetAudit(row: any): NormalizedSnippetAudit {
  // 1. بررسی audit_result
  if (row.audit_result) {
    try {
      let auditData = row.audit_result;
      if (typeof auditData === 'string') {
        auditData = JSON.parse(auditData);
      }
      const validation = AdvancedAuditResultSchema.safeParse(auditData);
      if (validation.success) {
        return {
          status: { type: 'valid', audit: validation.data },
          hasFullAnalysis: true,
          findingsCount: validation.data.findings?.length || 0,
          verdictStatus: validation.data.verdict?.status,
          overallScore: validation.data.scorecard?.productionReadiness?.score ?? undefined,
          linkedinPost: validation.data.linkedinPost,
          summary: validation.data.summary,
        };
      }
    } catch (error) {
      logger.error('[NormalizeSnippetAudit] Failed to parse audit_result', { slug: row.slug, error });
    }
  }

  // 2. بررسی وجود فیلدهای Advanced جدید
  const hasNewAdvancedFields = !!(
    row.findings ||
    row.execution_overview ||
    row.scorecard_new ||
    row.verdict ||
    row.recommended_actions ||
    row.architectural_observations ||
    row.suggested_tests_new ||
    row.complexity ||
    row.limitations ||
    row.improved_code_jsonb ||
    row.improved_code
  );

  if (hasNewAdvancedFields) {
    try {
      const partialAudit: Partial<AdvancedAuditResult> = {
        schemaVersion: '1.0.0', // 🔥 اصلاح شده
        auditType: 'comprehensive',
        appliedSpecializations: row.execution_overview ? ['concurrency'] : [],
        completionStatus: 'complete',
        repairApplied: false,
        language: row.language || 'unknown',
        summary: row.key_concept || row.summary || '',
        executionOverview: row.execution_overview || { entryPoints: [], taskSubmissionPoints: [], blockingWaitPoints: [], sharedResources: [], resourceLifecycle: [] },
        findings: row.findings || [],
        architecturalObservations: row.architectural_observations || [],
        recommendedActions: row.recommended_actions || [],
        suggestedTests: row.suggested_tests_new || [],
        complexity: row.complexity || { applicable: false, expression: null, explanation: null, variables: [], assumptions: [] },
        scorecard: row.scorecard_new || { correctness: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] } },
        verdict: row.verdict || { status: 'requires-changes', explanation: 'No verdict data' },
        limitations: row.limitations || [],
        improvedCode: row.improved_code_jsonb || row.improved_code ? { available: true, code: row.improved_code || '', notes: 'Migrated from improved_code' } : { available: false, code: null, notes: 'No improved code' },
        linkedinPost: row.linkedin_post || 'Check out this code analysis! #Zbloue',
        title: row.card_title || 'Code Analysis',
        analysisCoverage: [
          'correctness', 'security', 'concurrency', 'liveness', 'performance',
          'resource-management', 'error-handling', 'input-validation', 'data-integrity',
          'api-design', 'architecture', 'maintainability', 'testability', 'observability',
          'compatibility'
        ].map(dim => ({
          dimension: dim as any,
          status: 'analyzed',
          summary: `Analysis of ${dim} dimension.`,
          limitation: null,
        })),
      };

      const validation = AdvancedAuditResultSchema.safeParse(partialAudit);
      if (validation.success) {
        return {
          status: { type: 'valid', audit: validation.data },
          hasFullAnalysis: true,
          findingsCount: validation.data.findings?.length || 0,
          verdictStatus: validation.data.verdict?.status,
          overallScore: validation.data.scorecard?.productionReadiness?.score ?? undefined,
          linkedinPost: validation.data.linkedinPost,
          summary: validation.data.summary,
        };
      } else {
        return {
          status: { type: 'legacy', audit: partialAudit },
          hasFullAnalysis: true,
          findingsCount: (row.findings?.length || 0),
          verdictStatus: row.verdict?.status,
          overallScore: row.scorecard_new?.productionReadiness?.score ?? undefined,
          linkedinPost: row.linkedin_post,
          summary: row.summary || row.key_concept,
        };
      }
    } catch (error) {
      logger.error('[NormalizeSnippetAudit] Failed to build audit from fields', { slug: row.slug, error });
      return {
        status: { type: 'unavailable' },
        hasFullAnalysis: true,
        findingsCount: (row.findings?.length || 0),
        verdictStatus: row.verdict?.status,
        overallScore: row.scorecard_new?.productionReadiness?.score ?? undefined,
        linkedinPost: row.linkedin_post,
        summary: row.summary || row.key_concept,
      };
    }
  }

  // 3. Fallback به Legacy
  const legacyAudit = legacyRowToAudit(row);
  const hasLegacyData = legacyAudit !== null && Object.keys(legacyAudit).length > 0;

  if (hasLegacyData) {
    return {
      status: { type: 'legacy', audit: legacyAudit },
      hasFullAnalysis: true,
      findingsCount: legacyAudit.findings?.length || 0,
      verdictStatus: (legacyAudit as any).verdict?.status,
      overallScore: (legacyAudit as any).scorecard?.productionReadiness?.score ?? undefined,
      linkedinPost: (legacyAudit as any).linkedinPost || row.linkedin_post,
      summary: legacyAudit.summary,
    };
  }

  // 4. هیچ داده‌ای وجود ندارد
  return {
    status: { type: 'unavailable' },
    hasFullAnalysis: false,
    findingsCount: 0,
  };
}

// ============================================================
// 🔥 Helper: check if full analysis exists
// ============================================================
export function hasFullAnalysis(row: any): boolean {
  if (row.audit_result) {
    try {
      const auditData = typeof row.audit_result === 'string' ? JSON.parse(row.audit_result) : row.audit_result;
      const validation = AdvancedAuditResultSchema.safeParse(auditData);
      if (validation.success) return true;
    } catch { /* ignore */ }
  }
  return !!(row.findings || row.execution_overview || row.scorecard_new || row.verdict ||
    row.recommended_actions || row.architectural_observations || row.suggested_tests_new ||
    row.complexity || row.limitations || row.improved_code);
}

// ============================================================
// 🔥 Helper: get findings count
// ============================================================
export function getFindingsCount(row: any): number {
  if (row.audit_result) {
    try {
      const auditData = typeof row.audit_result === 'string' ? JSON.parse(row.audit_result) : row.audit_result;
      if (auditData.findings && Array.isArray(auditData.findings)) {
        return auditData.findings.length;
      }
    } catch { /* ignore */ }
  }
  if (row.findings && Array.isArray(row.findings)) {
    return row.findings.length;
  }
  return 0;
}