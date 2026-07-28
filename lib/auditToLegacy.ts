// lib/auditToLegacy.ts

import type { LegacyGenerateResponse } from '@/types';

/**
 * تبدیل AdvancedAuditResult (کانونیکال) به LegacyGenerateResponse
 * برای استفاده در کلاینت (مخصوص حالت Advanced)
 * 🔥 این تابع فقط برای سازگاری با کامپوننت‌های فعلی استفاده می‌شود
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