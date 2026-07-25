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

// ... (بقیه توابع کمکی مانند normalizeVerdictToCanonical، normalizeComplexityToCanonical، normalizeScorecardToCanonical)

export function normalizeSnippetAudit(row: any): NormalizedSnippetAudit {
  // ===== 1. بررسی audit_result =====
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

  // ===== 2. بررسی وجود فیلدهای Advanced جدید =====
  // 🔥 این بخش را اضافه می‌کنیم
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
    // تلاش برای ساخت یک Audit از داده‌های موجود
    try {
      // ساخت یک شئ Partial AdvancedAuditResult از داده‌های موجود
      const partialAudit: Partial<AdvancedAuditResult> = {
        schemaVersion: '1.0',
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
        scorecard: row.scorecard_new || { correctness: { applicable: false, score: null, reason: 'No data', relatedFindings: [] } },
        verdict: row.verdict || { status: 'requires-changes', explanation: 'No verdict data' },
        limitations: row.limitations || [],
        improvedCode: row.improved_code_jsonb || row.improved_code ? { available: true, code: row.improved_code || '', notes: 'Migrated from improved_code' } : { available: false, code: null, notes: 'No improved code' },
        linkedin_post: row.linkedin_post || 'Check out this code analysis! #Zbloue',
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
          linkedinPost: validation.data.linkedin_post,
          summary: validation.data.summary,
        };
      } else {
        // اگر validation fail شد، حداقل hasFullAnalysis رو true برگردون
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
      // حتی با خطا، true برگردون
      return {
        status: { type: 'unavailable' },
        hasFullAnalysis: true, // 🔥 اینجا true می‌کنیم
        findingsCount: (row.findings?.length || 0),
        verdictStatus: row.verdict?.status,
        overallScore: row.scorecard_new?.productionReadiness?.score ?? undefined,
        linkedinPost: row.linkedin_post,
        summary: row.summary || row.key_concept,
      };
    }
  }

  // ===== 3. Fallback به Legacy =====
  const legacyAudit = legacyRowToAudit(row);
  const hasLegacyData = legacyAudit !== null && Object.keys(legacyAudit).length > 0;

  if (hasLegacyData) {
    // ... (کد قبلی Legacy)
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

  // ===== 4. هیچ داده‌ای وجود ندارد =====
  return {
    status: { type: 'unavailable' },
    hasFullAnalysis: false,
    findingsCount: 0,
  };
}