// lib/analysis/validator.ts

import { z } from 'zod';
import {
  AdvancedAuditResultSchema,
  type AdvancedAuditResult,
  FindingIdSchema,
  VerdictStatusSchema,
  CompletionStatusSchema,
  SpecializationSchema,
  BroadCategorySchema,
  MechanismSchema,
  AnalysisCoverageItemSchema,
} from './schema';
import type {
  AuditValidationResult,
  ValidationIssue,
  DetectorResult,
} from './types';
import { getLineCount, isValidLineRange, getLineContent } from './numberedCode';
import logger from '@/lib/logger';

// ============================================================
// 🔥 Similarity Function (Levenshtein)
// ============================================================

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function similarityScore(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const dist = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - dist / maxLen;
}

function isSimilarEnough(a: string, b: string, threshold: number = 0.7): boolean {
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
  const normA = normalize(a);
  const normB = normalize(b);
  if (normA === normB) return true;
  const score = similarityScore(normA, normB);
  return score >= threshold;
}

// ============================================================
// VALIDATION: Evidence lines
// ============================================================

function validateEvidenceLines(
  result: unknown,
  code: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const totalLines = getLineCount(code);

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return issues;
  }
  const findings = (result as any).findings ?? [];
  if (!Array.isArray(findings)) return issues;

  for (const finding of findings) {
    const evidence = finding?.evidence ?? [];
    if (!Array.isArray(evidence)) continue;
    for (const ev of evidence) {
      const startLine = ev?.startLine;
      const endLine = ev?.endLine;
      if (typeof startLine !== 'number' || typeof endLine !== 'number') {
        issues.push({
          code: 'EVIDENCE_LINE_MISSING',
          severity: 'error',
          message: 'Evidence missing startLine or endLine',
          relatedLines: [],
        });
        continue;
      }
      if (!isValidLineRange(code, startLine, endLine)) {
        issues.push({
          code: 'EVIDENCE_LINE_OUT_OF_RANGE',
          severity: 'error',
          message: `Evidence line range ${startLine}-${endLine} is out of bounds (total ${totalLines} lines)`,
          relatedLines: [startLine, endLine],
        });
        continue;
      }
      if (startLine > endLine) {
        issues.push({
          code: 'EVIDENCE_LINE_REVERSED',
          severity: 'error',
          message: `Evidence startLine ${startLine} > endLine ${endLine}`,
          relatedLines: [startLine, endLine],
        });
        continue;
      }
      const actualCode = getLineContent(code, startLine, endLine);
      const evidenceCode = ev?.code ?? '';
      if (actualCode && evidenceCode.trim()) {
        if (!isSimilarEnough(actualCode, evidenceCode, 0.7)) {
          issues.push({
            code: 'EVIDENCE_CODE_MISMATCH',
            severity: 'warning',
            message: `Evidence code does not appear to match the actual source at lines ${startLine}-${endLine}. Similarity score: ${Math.round(similarityScore(actualCode, evidenceCode) * 100)}%`,
            relatedLines: [startLine, endLine],
          });
        }
      }
    }
  }
  return issues;
}

// ============================================================
// VALIDATION: Finding IDs and uniqueness
// ============================================================

function validateFindingIds(result: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return issues;
  }
  const findings = (result as any).findings ?? [];
  if (!Array.isArray(findings)) return issues;

  for (const finding of findings) {
    const id = finding?.id;
    if (typeof id !== 'string') {
      issues.push({
        code: 'FINDING_ID_MISSING',
        severity: 'error',
        message: 'Finding missing id field',
        relatedLines: [],
      });
      continue;
    }
    const idCheck = FindingIdSchema.safeParse(id);
    if (!idCheck.success) {
      issues.push({
        code: 'INVALID_FINDING_ID_FORMAT',
        severity: 'error',
        message: `Finding ID "${id}" does not match required format F-\\d{3,}`,
        relatedLines: [],
      });
      continue;
    }
    if (ids.has(id)) {
      issues.push({
        code: 'DUPLICATE_FINDING_ID',
        severity: 'error',
        message: `Duplicate finding ID "${id}" found`,
        relatedLines: [],
      });
    } else {
      ids.add(id);
    }
  }
  return issues;
}

// ============================================================
// VALIDATION: Finding taxonomy (category & mechanisms)
// ============================================================

function validateFindingTaxonomy(result: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return issues;
  }
  const findings = (result as any).findings ?? [];
  if (!Array.isArray(findings)) return issues;

  for (const finding of findings) {
    const category = finding?.category;
    if (category && !BroadCategorySchema.safeParse(category).success) {
      issues.push({
        code: 'INVALID_FINDING_CATEGORY',
        severity: 'error',
        message: `Finding "${finding?.id || 'unknown'}" has invalid category: ${category}`,
        relatedLines: [],
      });
    }

    const mechanisms = finding?.mechanisms ?? [];
    if (Array.isArray(mechanisms)) {
      for (const m of mechanisms) {
        if (!MechanismSchema.safeParse(m).success) {
          issues.push({
            code: 'INVALID_MECHANISM',
            severity: 'warning',
            message: `Finding "${finding?.id || 'unknown'}" has invalid mechanism: ${m}`,
            relatedLines: [],
          });
        }
      }
    }
  }

  return issues;
}

// ============================================================
// VALIDATION: Related IDs (references)
// ============================================================

function validateRelatedIds(result: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return issues;
  }
  const findings = (result as any).findings ?? [];
  const allIds = new Set(
    Array.isArray(findings) ? findings.map((f: any) => f?.id).filter(Boolean) : []
  );

  const observations = (result as any).architecturalObservations ?? [];
  if (Array.isArray(observations)) {
    for (const obs of observations) {
      const relatedIds = obs?.relatedFindingIds ?? [];
      if (!Array.isArray(relatedIds)) continue;
      for (const id of relatedIds) {
        if (typeof id !== 'string') continue;
        if (!allIds.has(id)) {
          issues.push({
            code: 'RELATED_ID_NOT_FOUND',
            severity: 'warning',
            message: `Architectural observation references non-existent finding ID: ${id}`,
            relatedLines: [],
          });
        }
      }
    }
  }

  const actions = (result as any).recommendedActions ?? [];
  if (Array.isArray(actions)) {
    for (const action of actions) {
      const relatedIds = action?.relatedFindingIds ?? [];
      if (!Array.isArray(relatedIds)) continue;
      for (const id of relatedIds) {
        if (typeof id !== 'string') continue;
        if (!allIds.has(id)) {
          issues.push({
            code: 'RELATED_ID_NOT_FOUND',
            severity: 'warning',
            message: `Recommended action references non-existent finding ID: ${id}`,
            relatedLines: [],
          });
        }
      }
    }
  }

  // Scorecard relatedFindings
  const scorecard = (result as any).scorecard;
  if (scorecard && typeof scorecard === 'object') {
    for (const category of Object.values(scorecard)) {
      if (category && typeof category === 'object') {
        const relatedIds = (category as any).relatedFindings ?? [];
        if (Array.isArray(relatedIds)) {
          for (const id of relatedIds) {
            if (typeof id !== 'string') continue;
            if (!allIds.has(id)) {
              issues.push({
                code: 'RELATED_ID_NOT_FOUND',
                severity: 'warning',
                message: `Scorecard category references non-existent finding ID: ${id}`,
                relatedLines: [],
              });
            }
          }
        }
      }
    }
  }

  // SuggestedTests relatedFindingIds
  const suggestedTests = (result as any).suggestedTests ?? [];
  if (Array.isArray(suggestedTests)) {
    for (const test of suggestedTests) {
      const relatedIds = test?.relatedFindingIds ?? [];
      if (!Array.isArray(relatedIds)) continue;
      for (const id of relatedIds) {
        if (typeof id !== 'string') continue;
        if (!allIds.has(id)) {
          issues.push({
            code: 'RELATED_ID_NOT_FOUND',
            severity: 'warning',
            message: `Suggested test references non-existent finding ID: ${id}`,
            relatedLines: [],
          });
        }
      }
    }
  }

  return issues;
}

// ============================================================
// VALIDATION: Scorecard (canonical structure)
// ============================================================

function validateScorecard(result: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return issues;
  }
  const scorecard = (result as any).scorecard;
  if (!scorecard || typeof scorecard !== 'object') return issues;

  for (const [key, value] of Object.entries(scorecard)) {
    if (value && typeof value === 'object') {
      const applicable = (value as any).applicable;
      const score = (value as any).score;
      const reason = (value as any).reason;
      const relatedFindings = (value as any).relatedFindings;

      // Check applicability and score consistency
      if (applicable === true) {
        if (typeof score !== 'number' || score < 0 || score > 100) {
          issues.push({
            code: 'SCORECARD_VALUE_OUT_OF_RANGE',
            severity: 'error',
            message: `Scorecard field "${key}" has invalid score: ${score}. Must be 0-100.`,
            relatedLines: [],
          });
        }
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
          issues.push({
            code: 'SCORECARD_MISSING_REASON',
            severity: 'warning',
            message: `Scorecard field "${key}" missing reason despite being applicable.`,
            relatedLines: [],
          });
        }
        if (!Array.isArray(relatedFindings)) {
          issues.push({
            code: 'SCORECARD_INVALID_RELATED_FINDINGS',
            severity: 'error',
            message: `Scorecard field "${key}" relatedFindings must be an array.`,
            relatedLines: [],
          });
        }
      } else if (applicable === false) {
        if (score !== null) {
          issues.push({
            code: 'SCORECARD_INVALID_NULL_SCORE',
            severity: 'error',
            message: `Scorecard field "${key}" is not applicable but score is not null.`,
            relatedLines: [],
          });
        }
        if (relatedFindings && Array.isArray(relatedFindings) && relatedFindings.length > 0) {
          issues.push({
            code: 'SCORECARD_RELATED_FINDINGS_NOT_EMPTY',
            severity: 'warning',
            message: `Scorecard field "${key}" is not applicable but has relatedFindings.`,
            relatedLines: [],
          });
        }
      } else {
        issues.push({
          code: 'SCORECARD_MISSING_APPLICABLE',
          severity: 'error',
          message: `Scorecard field "${key}" missing 'applicable' flag.`,
          relatedLines: [],
        });
      }
    } else {
      issues.push({
        code: 'SCORECARD_INVALID_STRUCTURE',
        severity: 'error',
        message: `Scorecard field "${key}" has invalid structure. Expected object.`,
        relatedLines: [],
      });
    }
  }
  return issues;
}

// ============================================================
// VALIDATION: Verdict consistency
// ============================================================

function validateVerdictConsistency(result: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return issues;
  }
  const findings = (result as any).findings ?? [];
  const verdict = (result as any).verdict;
  if (!verdict || typeof verdict !== 'object') return issues;

  const hasCritical = Array.isArray(findings) && findings.some((f: any) => f?.severity === 'critical');
  const hasHigh = Array.isArray(findings) && findings.some((f: any) => f?.severity === 'high');

  const verdictStatus = verdict.status;
  if (typeof verdictStatus === 'string') {
    if (hasCritical && (verdictStatus === 'approved' || verdictStatus === 'approved-with-suggestions' || verdictStatus === 'requires-minor-changes')) {
      issues.push({
        code: 'VERDICT_INCONSISTENT',
        severity: 'warning',
        message: 'Critical findings present but verdict is not requires-major-changes or requires-changes',
        relatedLines: [],
      });
    }
    if (hasHigh && verdictStatus === 'approved') {
      issues.push({
        code: 'VERDICT_INCONSISTENT',
        severity: 'warning',
        message: 'High severity findings present but verdict is approved',
        relatedLines: [],
      });
    }
  }
  return issues;
}

// ============================================================
// VALIDATION: LinkedIn post
// ============================================================

function validateLinkedInPost(result: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return issues;
  }
  const post = (result as any).linkedin_post;
  if (typeof post === 'string') {
    if (post.length > 300) {
      issues.push({
        code: 'LINKEDIN_POST_TOO_LONG',
        severity: 'error',
        message: `linkedin_post exceeds 300 characters (${post.length})`,
        relatedLines: [],
      });
    }
    if (post.trim().length === 0) {
      issues.push({
        code: 'LINKEDIN_POST_EMPTY',
        severity: 'error',
        message: 'linkedin_post is empty after trimming',
        relatedLines: [],
      });
    }
  } else {
    issues.push({
      code: 'LINKEDIN_POST_MISSING',
      severity: 'error',
      message: 'linkedin_post is required but missing or not a string',
      relatedLines: [],
    });
  }
  return issues;
}

// ============================================================
// VALIDATION: Analysis Coverage
// ============================================================

const REQUIRED_DIMENSIONS = [
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

function validateAnalysisCoverage(result: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return issues;
  }

  const coverage = (result as any).analysisCoverage;
  if (!Array.isArray(coverage) || coverage.length === 0) {
    issues.push({
      code: 'MISSING_ANALYSIS_COVERAGE',
      severity: 'error',
      message: 'analysisCoverage is required and must be a non-empty array',
      relatedLines: [],
    });
    return issues;
  }

  // Check all required dimensions are present
  const presentDimensions = new Set(coverage.map((item: any) => item.dimension));
  for (const dim of REQUIRED_DIMENSIONS) {
    if (!presentDimensions.has(dim)) {
      issues.push({
        code: 'MISSING_COVERAGE_DIMENSION',
        severity: 'error',
        message: `analysisCoverage missing required dimension: ${dim}`,
        relatedLines: [],
      });
    }
  }

  // Validate each item
  for (const item of coverage) {
    if (!item.dimension || typeof item.dimension !== 'string') {
      issues.push({
        code: 'INVALID_COVERAGE_DIMENSION',
        severity: 'error',
        message: 'analysisCoverage item missing valid dimension',
        relatedLines: [],
      });
      continue;
    }

    const status = item.status;
    if (status && !['analyzed', 'not-applicable', 'limited'].includes(status)) {
      issues.push({
        code: 'INVALID_COVERAGE_STATUS',
        severity: 'error',
        message: `analysisCoverage item "${item.dimension}" has invalid status: ${status}`,
        relatedLines: [],
      });
    }

    if (item.limitation !== undefined && item.limitation !== null && typeof item.limitation !== 'string') {
      issues.push({
        code: 'INVALID_COVERAGE_LIMITATION',
        severity: 'warning',
        message: `analysisCoverage item "${item.dimension}" has invalid limitation type`,
        relatedLines: [],
      });
    }
  }

  return issues;
}

// ============================================================
// VALIDATION: Completion Status & Repair Applied
// ============================================================

function validateCompletionMetadata(result: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return issues;
  }

  const completionStatus = (result as any).completionStatus;
  if (!completionStatus) {
    issues.push({
      code: 'MISSING_COMPLETION_STATUS',
      severity: 'error',
      message: 'completionStatus is required',
      relatedLines: [],
    });
  } else if (!CompletionStatusSchema.safeParse(completionStatus).success) {
    issues.push({
      code: 'INVALID_COMPLETION_STATUS',
      severity: 'error',
      message: `completionStatus has invalid value: ${completionStatus}`,
      relatedLines: [],
    });
  }

  const repairApplied = (result as any).repairApplied;
  if (repairApplied !== undefined && typeof repairApplied !== 'boolean') {
    issues.push({
      code: 'INVALID_REPAIR_APPLIED',
      severity: 'error',
      message: 'repairApplied must be a boolean',
      relatedLines: [],
    });
  }

  // auditType must be 'comprehensive'
  const auditType = (result as any).auditType;
  if (auditType && auditType !== 'comprehensive') {
    issues.push({
      code: 'INVALID_AUDIT_TYPE',
      severity: 'error',
      message: `auditType must be 'comprehensive', got: ${auditType}`,
      relatedLines: [],
    });
  }

  // appliedSpecializations
  const specializations = (result as any).appliedSpecializations;
  if (specializations !== undefined) {
    if (!Array.isArray(specializations)) {
      issues.push({
        code: 'INVALID_SPECIALIZATIONS',
        severity: 'error',
        message: 'appliedSpecializations must be an array',
        relatedLines: [],
      });
    } else {
      for (const spec of specializations) {
        if (!SpecializationSchema.safeParse(spec).success) {
          issues.push({
            code: 'INVALID_SPECIALIZATION_VALUE',
            severity: 'error',
            message: `appliedSpecializations has invalid value: ${spec}`,
            relatedLines: [],
          });
        }
      }
    }
  }

  return issues;
}

// ============================================================
// MAIN SEMANTIC VALIDATION
// ============================================================

export function validateSemanticCompleteness(
  result: unknown,
  detectorResult: DetectorResult,
  code: string
): AuditValidationResult {
  const allIssues: ValidationIssue[] = [];

  try {
    const evidenceIssues = validateEvidenceLines(result, code);
    allIssues.push(...evidenceIssues);
  } catch (err) {
    logger.error('[Validator] validateEvidenceLines crashed:', err);
    allIssues.push({
      code: 'SEMANTIC_VALIDATION_CRASH',
      severity: 'error',
      message: `validateEvidenceLines crashed: ${err instanceof Error ? err.message : 'unknown error'}`,
      relatedLines: [],
    });
  }

  try {
    const idIssues = validateFindingIds(result);
    allIssues.push(...idIssues);
  } catch (err) {
    logger.error('[Validator] validateFindingIds crashed:', err);
    allIssues.push({
      code: 'SEMANTIC_VALIDATION_CRASH',
      severity: 'error',
      message: `validateFindingIds crashed: ${err instanceof Error ? err.message : 'unknown error'}`,
      relatedLines: [],
    });
  }

  try {
    const taxonomyIssues = validateFindingTaxonomy(result);
    allIssues.push(...taxonomyIssues);
  } catch (err) {
    logger.error('[Validator] validateFindingTaxonomy crashed:', err);
    allIssues.push({
      code: 'SEMANTIC_VALIDATION_CRASH',
      severity: 'error',
      message: `validateFindingTaxonomy crashed: ${err instanceof Error ? err.message : 'unknown error'}`,
      relatedLines: [],
    });
  }

  try {
    const relatedIssues = validateRelatedIds(result);
    allIssues.push(...relatedIssues);
  } catch (err) {
    logger.error('[Validator] validateRelatedIds crashed:', err);
    allIssues.push({
      code: 'SEMANTIC_VALIDATION_CRASH',
      severity: 'error',
      message: `validateRelatedIds crashed: ${err instanceof Error ? err.message : 'unknown error'}`,
      relatedLines: [],
    });
  }

  try {
    const scorecardIssues = validateScorecard(result);
    allIssues.push(...scorecardIssues);
  } catch (err) {
    logger.error('[Validator] validateScorecard crashed:', err);
    allIssues.push({
      code: 'SEMANTIC_VALIDATION_CRASH',
      severity: 'error',
      message: `validateScorecard crashed: ${err instanceof Error ? err.message : 'unknown error'}`,
      relatedLines: [],
    });
  }

  try {
    const verdictIssues = validateVerdictConsistency(result);
    allIssues.push(...verdictIssues);
  } catch (err) {
    logger.error('[Validator] validateVerdictConsistency crashed:', err);
    allIssues.push({
      code: 'SEMANTIC_VALIDATION_CRASH',
      severity: 'error',
      message: `validateVerdictConsistency crashed: ${err instanceof Error ? err.message : 'unknown error'}`,
      relatedLines: [],
    });
  }

  try {
    const linkedinIssues = validateLinkedInPost(result);
    allIssues.push(...linkedinIssues);
  } catch (err) {
    logger.error('[Validator] validateLinkedInPost crashed:', err);
    allIssues.push({
      code: 'SEMANTIC_VALIDATION_CRASH',
      severity: 'error',
      message: `validateLinkedInPost crashed: ${err instanceof Error ? err.message : 'unknown error'}`,
      relatedLines: [],
    });
  }

  try {
    const coverageIssues = validateAnalysisCoverage(result);
    allIssues.push(...coverageIssues);
  } catch (err) {
    logger.error('[Validator] validateAnalysisCoverage crashed:', err);
    allIssues.push({
      code: 'SEMANTIC_VALIDATION_CRASH',
      severity: 'error',
      message: `validateAnalysisCoverage crashed: ${err instanceof Error ? err.message : 'unknown error'}`,
      relatedLines: [],
    });
  }

  try {
    const metadataIssues = validateCompletionMetadata(result);
    allIssues.push(...metadataIssues);
  } catch (err) {
    logger.error('[Validator] validateCompletionMetadata crashed:', err);
    allIssues.push({
      code: 'SEMANTIC_VALIDATION_CRASH',
      severity: 'error',
      message: `validateCompletionMetadata crashed: ${err instanceof Error ? err.message : 'unknown error'}`,
      relatedLines: [],
    });
  }

  // Concurrency-specific validation (only if concurrency signals detected)
  if (detectorResult.requiresConcurrencyAudit) {
    try {
      const concurrencyIssues = validateConcurrencyCoverage(result, detectorResult);
      allIssues.push(...concurrencyIssues);
    } catch (err) {
      logger.error('[Validator] validateConcurrencyCoverage crashed:', err);
      allIssues.push({
        code: 'SEMANTIC_VALIDATION_CRASH',
        severity: 'error',
        message: `validateConcurrencyCoverage crashed: ${err instanceof Error ? err.message : 'unknown error'}`,
        relatedLines: [],
      });
    }
  }

  const structurallyValid = true; // Zod already validated structure
  const semanticallyComplete =
    !allIssues.some((i) => i.severity === 'error' && i.code !== 'EVIDENCE_LINE_OUT_OF_RANGE');

  const repairRequired = !semanticallyComplete;

  return {
    structurallyValid,
    semanticallyComplete,
    issues: allIssues,
    repairRequired,
  };
}

// ============================================================
// CONCURRENCY-SPECIFIC VALIDATION (kept from original)
// ============================================================

function validateConcurrencyCoverage(
  result: unknown,
  detectorResult: DetectorResult
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return issues;
  }
  const findings = (result as any).findings ?? [];
  const signals = detectorResult.signals ?? [];

  // Check if concurrency is actually applied
  const appliedSpecializations = (result as any).appliedSpecializations ?? [];
  if (detectorResult.requiresConcurrencyAudit && !appliedSpecializations.includes('concurrency')) {
    issues.push({
      code: 'MISSING_CONCURRENCY_SPECIALIZATION',
      severity: 'error',
      message: 'Concurrency signals detected but appliedSpecializations does not include "concurrency"',
      relatedLines: signals.map((s: any) => s?.line ?? 0),
    });
  }

  const hasExecutorSignals = signals.some(
    (s: any) => s?.type === 'EXECUTOR' || s?.type === 'THREAD_POOL' || s?.type === 'EXECUTOR_SUBMIT'
  );
  const hasLivenessFindings = Array.isArray(findings) && findings.some(
    (f: any) => f?.category === 'liveness' || f?.category === 'thread-starvation' || f?.category === 'deadlock'
  );
  if (hasExecutorSignals && !hasLivenessFindings) {
    issues.push({
      code: 'MISSING_LIVENESS_ANALYSIS',
      severity: 'warning',
      message: 'Executor signals detected but no liveness findings reported',
      relatedLines: signals.filter((s: any) =>
        ['EXECUTOR', 'THREAD_POOL', 'EXECUTOR_SUBMIT'].includes(s?.type)
      ).map((s: any) => s?.line ?? 0),
    });
  }

  const hasFutureGet = signals.some((s: any) => s?.type === 'FUTURE_GET');
  const hasBlockingAnalysis = Array.isArray(findings) && findings.some(
    (f: any) => f?.category === 'thread-starvation' || f?.category === 'liveness'
  );
  if (hasFutureGet && !hasBlockingAnalysis) {
    issues.push({
      code: 'MISSING_BLOCKING_WAIT_ANALYSIS',
      severity: 'warning',
      message: 'Future.get detected but no blocking wait analysis found',
      relatedLines: signals.filter((s: any) => s?.type === 'FUTURE_GET').map((s: any) => s?.line ?? 0),
    });
  }

  return issues;
}