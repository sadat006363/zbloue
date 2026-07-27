// lib/snippetAdapter.ts

import { AdvancedAuditResult } from '@/lib/analysis/types';
import type { LegacyGenerateResponse } from '@/types';

/**
 * تبدیل audit_result به شکل Legacy برای سازگاری موقت
 * 🔥 پارامتر audit به‌صورت any پذیرفته می‌شود تا با Json از دیتابیس سازگار باشد.
 */
export function adaptCanonicalToLegacy(audit: any): {
  card_title: string;
  key_concept: string;
  what_this_code_does: string;
  debug_analysis: string;
  optimization: string;
  linkedin_post: string;
  summary: string;
  findings: any[];
  scorecard_new: any;
  verdict: any;
} {
  // اگر audit از نوع string بود، parse کن
  let normalizedAudit = audit;
  if (typeof audit === 'string') {
    try {
      normalizedAudit = JSON.parse(audit);
    } catch {
      normalizedAudit = null;
    }
  }

  if (!normalizedAudit || typeof normalizedAudit !== 'object') {
    return {
      card_title: 'Code Analysis',
      key_concept: '',
      what_this_code_does: '',
      debug_analysis: '-',
      optimization: '-',
      linkedin_post: 'Check out this code analysis! #Zbloue',
      summary: '',
      findings: [],
      scorecard_new: null,
      verdict: null,
    };
  }

  return {
    card_title: normalizedAudit.title || 'Code Analysis',
    key_concept: normalizedAudit.summary || '',
    what_this_code_does: normalizedAudit.executionOverview?.entryPoints?.join(', ') || normalizedAudit.summary || '',
    debug_analysis: normalizedAudit.findings?.length ? `${normalizedAudit.findings.length} findings` : '-',
    optimization: normalizedAudit.recommendedActions?.length
      ? normalizedAudit.recommendedActions.map((a: any) => a.title).join('; ')
      : '-',
    linkedin_post: normalizedAudit.linkedinPost || 'Check out this code analysis! #Zbloue',
    summary: normalizedAudit.summary || '',
    findings: normalizedAudit.findings || [],
    scorecard_new: normalizedAudit.scorecard || null,
    verdict: normalizedAudit.verdict || null,
  };
}

/**
 * بررسی اینکه آیا audit_result کامل وجود دارد یا خیر
 * 🔥 پارامتر snippet به‌صورت any پذیرفته می‌شود.
 */
export function hasCanonicalAudit(snippet: any): boolean {
  if (!snippet) return false;
  const audit = snippet.audit_result;
  if (!audit) return false;
  if (typeof audit === 'string') {
    try {
      const parsed = JSON.parse(audit);
      return parsed !== null && typeof parsed === 'object';
    } catch {
      return false;
    }
  }
  return typeof audit === 'object' && audit !== null;
}

/**
 * تبدیل AdvancedAuditResult به LegacyGenerateResponse کامل
 * برای استفاده در کلاینت (مخصوص حالت Advanced)
 * 🔥 از undefined به جای null استفاده می‌کنیم تا با تایپ‌های LegacyGenerateResponse سازگار باشد.
 */
export function canonicalToLegacyResponse(audit: any): LegacyGenerateResponse {
  if (!audit || typeof audit !== 'object') {
    return {
      analysis: '',
      card_title: 'Code Analysis',
      key_concept: '',
      what_this_code_does: '',
      debug_analysis: '-',
      optimization: '-',
      linkedin_post: 'Check out this code analysis! #Zbloue',
      findings: [],
      scorecard: undefined,
      verdict: undefined,
      executionOverview: undefined,
      architecturalObservations: [],
      recommendedActions: [],
      suggestedTests: [],
      complexity: undefined,
      limitations: [],
      improvedCode: undefined,
      finalVerdict: undefined,
      error: undefined,
    };
  }

  return {
    analysis: audit.summary || '',
    card_title: audit.title || 'Code Analysis',
    key_concept: audit.summary?.slice(0, 2000) || '',
    what_this_code_does: audit.executionOverview?.entryPoints?.join(', ') || audit.summary || '',
    debug_analysis: audit.findings?.length ? `${audit.findings.length} findings` : '-',
    optimization: audit.recommendedActions?.length
      ? audit.recommendedActions.map((a: any) => a.title).join('; ')
      : '-',
    linkedin_post: audit.linkedinPost || 'Check out this code analysis! #Zbloue',
    findings: audit.findings || [],
    scorecard: audit.scorecard || undefined,
    verdict: audit.verdict || undefined,
    executionOverview: audit.executionOverview || undefined,
    architecturalObservations: audit.architecturalObservations || [],
    recommendedActions: audit.recommendedActions || [],
    suggestedTests: audit.suggestedTests || [],
    complexity: audit.complexity || undefined,
    limitations: audit.limitations || [],
    improvedCode: audit.improvedCode?.available
      ? {
          available: audit.improvedCode.available,
          code: audit.improvedCode.code || '',
          notes: audit.improvedCode.notes || '',
        }
      : undefined,
    finalVerdict: audit.verdict
      ? {
          summary: audit.verdict.explanation,
          approved: audit.verdict.status === 'approved' || audit.verdict.status === 'approved-with-suggestions',
          nextSteps: '',
        }
      : undefined,
    error: undefined,
  };
}