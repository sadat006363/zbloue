// lib/snippetAdapter.ts

import { AdvancedAuditResult } from '@/lib/analysis/types';

/**
 * نرمال‌سازی audit_result: اگر string بود parse کن، در غیر این صورت همان را برگردان.
 */
function normalizeAuditResult(audit: any): AdvancedAuditResult | null {
  if (!audit) return null;
  if (typeof audit === 'string') {
    try {
      return JSON.parse(audit);
    } catch {
      return null;
    }
  }
  // فرض می‌کنیم object است
  return audit as AdvancedAuditResult;
}

/**
 * تبدیل audit_result به شکل Legacy برای سازگاری موقت
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
  const normalized = normalizeAuditResult(audit);
  if (!normalized) {
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
    card_title: normalized.title || 'Code Analysis',
    key_concept: normalized.summary || '',
    what_this_code_does: normalized.executionOverview?.entryPoints?.join(', ') || normalized.summary || '',
    debug_analysis: normalized.findings?.length ? `${normalized.findings.length} findings` : '-',
    optimization: normalized.recommendedActions?.length
      ? normalized.recommendedActions.map(a => a.title).join('; ')
      : '-',
    linkedin_post: normalized.linkedinPost || 'Check out this code analysis! #Zbloue',
    summary: normalized.summary || '',
    findings: normalized.findings || [],
    scorecard_new: normalized.scorecard || null,
    verdict: normalized.verdict || null,
  };
}

/**
 * بررسی اینکه آیا audit_result کامل وجود دارد یا خیر
 */
export function hasCanonicalAudit(snippet: any): boolean {
  if (!snippet) return false;
  const audit = snippet.audit_result;
  if (!audit) return false;
  // اگر string است، سعی می‌کنیم parse کنیم و اگر موفق بود و object بود true برگردانیم
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