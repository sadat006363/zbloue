// lib/analysis/normalize-snippet-audit.ts

import { AdvancedAuditResult, AdvancedAuditResultSchema } from './schema';
import logger from '@/lib/logger';

export type StoredAuditStatus =
  | { type: 'valid'; audit: AdvancedAuditResult }
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

/**
 * نرمال‌سازی داده‌های اسنیپت برای استخراج وضعیت تحلیل
 * 🔥 فقط از audit_result استفاده می‌کند – پشتیبانی از داده‌های Legacy حذف شد
 */
export function normalizeSnippetAudit(row: any): NormalizedSnippetAudit {
  // ===== بررسی audit_result =====
  if (row.audit_result) {
    try {
      let auditData = row.audit_result;
      if (typeof auditData === 'string') {
        auditData = JSON.parse(auditData);
      }
      const validation = AdvancedAuditResultSchema.safeParse(auditData);
      if (validation.success) {
        const audit = validation.data;
        return {
          status: { type: 'valid', audit },
          hasFullAnalysis: true,
          findingsCount: audit.findings?.length || 0,
          verdictStatus: audit.verdict?.status,
          overallScore: audit.scorecard?.productionReadiness?.score ?? undefined,
          linkedinPost: audit.linkedinPost,
          summary: audit.summary,
        };
      } else {
        logger.error('[NormalizeSnippetAudit] Invalid audit_result', {
          slug: row.slug,
          errors: validation.error.issues,
        });
        return {
          status: { type: 'invalid', error: 'Invalid audit_result structure' },
          hasFullAnalysis: false,
          findingsCount: 0,
        };
      }
    } catch (error) {
      logger.error('[NormalizeSnippetAudit] Failed to parse audit_result', {
        slug: row.slug,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        status: { type: 'invalid', error: 'Failed to parse audit_result' },
        hasFullAnalysis: false,
        findingsCount: 0,
      };
    }
  }

  // ===== اگر audit_result وجود نداشته باشد =====
  return {
    status: { type: 'unavailable' },
    hasFullAnalysis: false,
    findingsCount: 0,
  };
}

/**
 * بررسی وجود تحلیل کامل (فقط از audit_result)
 */
export function hasFullAnalysis(row: any): boolean {
  if (row.audit_result) {
    try {
      const auditData = typeof row.audit_result === 'string' ? JSON.parse(row.audit_result) : row.audit_result;
      const validation = AdvancedAuditResultSchema.safeParse(auditData);
      return validation.success;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * تعداد Findings از audit_result
 */
export function getFindingsCount(row: any): number {
  if (row.audit_result) {
    try {
      const auditData = typeof row.audit_result === 'string' ? JSON.parse(row.audit_result) : row.audit_result;
      if (auditData.findings && Array.isArray(auditData.findings)) {
        return auditData.findings.length;
      }
    } catch {
      // ignore
    }
  }
  return 0;
}