// lib/analysis/validator.ts

import { z } from 'zod';
import {
  AdvancedAuditResultSchema,
  type AdvancedAuditResult,
  FindingIdSchema,
} from './schema';
import type {
  AuditValidationResult,
  ValidationIssue,
  DetectorResult,
} from './types';
import { getLineCount, isValidLineRange, getLineContent } from './numberedCode';
import logger from '@/lib/logger';

// ============================================================
// VALIDATION: Evidence lines
// ============================================================

function validateEvidenceLines(
  result: unknown,
  code: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const totalLines = getLineCount(code);

  // Only proceed if result is a plain object and has findings
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
          expectedCoverage: 'Every evidence must have numeric line numbers',
        });
        continue;
      }
      if (!isValidLineRange(code, startLine, endLine)) {
        issues.push({
          code: 'EVIDENCE_LINE_OUT_OF_RANGE',
          severity: 'error',
          message: `Evidence line range ${startLine}-${endLine} is out of bounds (total ${totalLines} lines)`,
          relatedLines: [startLine, endLine],
          expectedCoverage: 'All evidence lines must be within source code range',
        });
        continue;
      }
      if (startLine > endLine) {
        issues.push({
          code: 'EVIDENCE_LINE_REVERSED',
          severity: 'error',
          message: `Evidence startLine ${startLine} > endLine ${endLine}`,
          relatedLines: [startLine, endLine],
          expectedCoverage: 'startLine must be <= endLine',
        });
        continue;
      }
      const actualCode = getLineContent(code, startLine, endLine);
      const evidenceCode = ev?.code ?? '';
      if (actualCode && evidenceCode.trim()) {
        const normalizedActual = actualCode.replace(/\s+/g, ' ').trim();
        const normalizedEvidence = evidenceCode.replace(/\s+/g, ' ').trim();
        if (!normalizedActual.includes(normalizedEvidence) && !normalizedEvidence.includes(normalizedActual)) {
          issues.push({
            code: 'EVIDENCE_CODE_MISMATCH',
            severity: 'warning',
            message: `Evidence code does not appear to match the actual source at lines ${startLine}-${endLine}`,
            relatedLines: [startLine, endLine],
            expectedCoverage: 'Evidence code should be a snippet from the source',
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
        expectedCoverage: 'Every finding must have an id',
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
        expectedCoverage: 'Finding IDs must follow format F-001, F-002, etc.',
      });
      continue;
    }
    if (ids.has(id)) {
      issues.push({
        code: 'DUPLICATE_FINDING_ID',
        severity: 'error',
        message: `Duplicate finding ID "${id}" found`,
        relatedLines: [],
        expectedCoverage: 'All finding IDs must be unique',
      });
    } else {
      ids.add(id);
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
            expectedCoverage: 'All relatedFindingIds must reference existing findings',
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
            expectedCoverage: 'All relatedFindingIds must reference existing findings',
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
                expectedCoverage: 'All relatedFindings must reference existing findings',
              });
            }
          }
        }
      }
    }
  }

  return issues;
}

// ============================================================
// VALIDATION: Scorecard ranges
// ============================================================

function validateScorecard(result: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return issues;
  }
  const scorecard = (result as any).scorecard;
  if (!scorecard || typeof scorecard !== 'object') return issues;

  // We only validate if scorecard is a plain object (not the old primitive)
  for (const [key, value] of Object.entries(scorecard)) {
    if (value && typeof value === 'object') {
      const score = (value as any).score;
      if (typeof score === 'number') {
        if (score < 0 || score > 100) {
          issues.push({
            code: 'SCORECARD_VALUE_OUT_OF_RANGE',
            severity: 'error',
            message: `Scorecard field "${key}" has value ${score}, expected between 0 and 100`,
            relatedLines: [],
            expectedCoverage: 'All scorecard values must be between 0 and 100',
          });
        }
      } else {
        issues.push({
          code: 'SCORECARD_VALUE_MISSING',
          severity: 'error',
          message: `Scorecard field "${key}" missing score number`,
          relatedLines: [],
          expectedCoverage: 'All scorecard categories must have a numeric score',
        });
      }
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
        message: 'Critical findings present but verdict is not requires-major-changes',
        relatedLines: [],
        expectedCoverage: 'Critical findings should downgrade production readiness verdict',
      });
    }
    if (hasHigh && verdictStatus === 'approved') {
      issues.push({
        code: 'VERDICT_INCONSISTENT',
        severity: 'warning',
        message: 'High severity findings present but verdict is approved',
        relatedLines: [],
        expectedCoverage: 'High findings should be resolved before approved verdict',
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
        expectedCoverage: 'linkedin_post must be at most 300 characters',
      });
    }
  } else {
    issues.push({
      code: 'LINKEDIN_POST_MISSING',
      severity: 'error',
      message: 'linkedin_post is required but missing',
      relatedLines: [],
      expectedCoverage: 'linkedin_post must be a non-empty string',
    });
  }
  return issues;
}

// ============================================================
// VALIDATION: Concurrency-specific coverage
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

  if (detectorResult.requiresConcurrencyAudit && (result as any).auditType === 'generic') {
    issues.push({
      code: 'MISSING_CONCURRENCY_ANALYSIS',
      severity: 'error',
      message: 'Concurrency signals detected but audit type is generic',
      relatedLines: signals.map((s: any) => s?.line ?? 0),
      expectedCoverage: 'Should analyze concurrency-related issues',
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
      expectedCoverage: 'Should analyze liveness risks (deadlock, starvation)',
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
      expectedCoverage: 'Should analyze blocking waits and nested submission risks',
    });
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

  // Structural validation already performed by Zod, but we still run
  // semantic validations on the already-validated object.
  // We assume result is AdvancedAuditResult at this point.
  // We'll still handle it as unknown to be safe.

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
      expectedCoverage: 'All evidence validation should complete without crashing',
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
      expectedCoverage: 'All ID validation should complete without crashing',
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
      expectedCoverage: 'All related IDs validation should complete without crashing',
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
      expectedCoverage: 'All scorecard validation should complete without crashing',
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
      expectedCoverage: 'All verdict consistency validation should complete without crashing',
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
      expectedCoverage: 'All linkedin_post validation should complete without crashing',
    });
  }

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
      expectedCoverage: 'All concurrency coverage validation should complete without crashing',
    });
  }

  const structurallyValid = true; // Zod already verified structural validity
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