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

function normalizeScorecardToCanonical(scorecard: any): any {
  if (!scorecard) return null;
  if (scorecard.correctness && typeof scorecard.correctness === 'object' && 'applicable' in scorecard.correctness) {
    return scorecard;
  }
  const legacy = scorecard;
  return {
    correctness: { applicable: true, score: (legacy.correctness || 0) * 10, reason: 'Migrated from legacy', relatedFindings: [] },
    concurrencySafety: { applicable: true, score: (legacy.security || 0) * 10, reason: 'Migrated from legacy', relatedFindings: [] },
    liveness: { applicable: true, score: (legacy.overall || 0) * 10, reason: 'Migrated from legacy', relatedFindings: [] },
    errorHandling: { applicable: true, score: (legacy.overall || 0) * 10, reason: 'Migrated from legacy', relatedFindings: [] },
    resourceManagement: { applicable: true, score: (legacy.overall || 0) * 10, reason: 'Migrated from legacy', relatedFindings: [] },
    maintainability: { applicable: true, score: (legacy.maintainability || 0) * 10, reason: 'Migrated from legacy', relatedFindings: [] },
    productionReadiness: { applicable: true, score: (legacy.productionReadiness || 0) * 10, reason: 'Migrated from legacy', relatedFindings: [] },
  };
}

export function normalizeSnippetAudit(row: any): NormalizedSnippetAudit {
  // 1. اگر audit_result موجود است
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
          linkedinPost: validation.data.linkedin_post,
          summary: validation.data.summary,
        };
      }
    } catch (error) {
      logger.error('[NormalizeSnippetAudit] Failed to parse audit_result', { slug: row.slug, error });
    }
  }

  // 2. Fallback به Legacy
  const legacyAudit = legacyRowToAudit(row);
  const hasLegacyData = legacyAudit !== null && Object.keys(legacyAudit).length > 0;

  if (hasLegacyData) {
    const normalizedVerdict = normalizeVerdictToCanonical(row.verdict);
    const normalizedComplexity = normalizeComplexityToCanonical(row.complexity);
    const normalizedScorecard = normalizeScorecardToCanonical(row.scorecard_new || row.scorecard);

    const fullAudit: Partial<AdvancedAuditResult> = {
      ...legacyAudit,
      verdict: normalizedVerdict || legacyAudit.verdict,
      complexity: normalizedComplexity || legacyAudit.complexity,
      scorecard: normalizedScorecard || legacyAudit.scorecard,
    };

    const validation = AdvancedAuditResultSchema.safeParse(fullAudit);
    if (validation.success) {
      return {
        status: { type: 'valid', audit: validation.data },
        hasFullAnalysis: true,
        findingsCount: validation.data.findings?.length || 0,
        verdictStatus: validation.data.verdict?.status,
        overallScore: validation.data.scorecard?.productionReadiness?.score ?? undefined,
        linkedinPost: validation.data.linkedin_post || row.linkedin_post,
        summary: validation.data.summary,
      };
    }

    return {
      status: { type: 'legacy', audit: legacyAudit },
      hasFullAnalysis: true,
      findingsCount: legacyAudit.findings?.length || 0,
      verdictStatus: (legacyAudit as any).verdict?.status,
      overallScore: (legacyAudit as any).scorecard?.productionReadiness?.score ?? undefined,
      linkedinPost: legacyAudit.linkedin_post || row.linkedin_post,
      summary: legacyAudit.summary,
    };
  }

  return {
    status: { type: 'unavailable' },
    hasFullAnalysis: false,
    findingsCount: 0,
  };
}

export function hasFullAnalysis(row: any): boolean {
  if (row.audit_result) {
    try {
      const auditData = typeof row.audit_result === 'string' ? JSON.parse(row.audit_result) : row.audit_result;
      const validation = AdvancedAuditResultSchema.safeParse(auditData);
      if (validation.success) return true;
    } catch { /* ignore */ }
  }
  return !!(
    row.findings ||
    row.execution_overview ||
    row.scorecard_new ||
    row.verdict ||
    row.recommended_actions ||
    row.architectural_observations ||
    row.suggested_tests_new ||
    row.complexity ||
    row.limitations ||
    row.improved_code
  );
}

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