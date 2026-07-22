// lib/analysis/repair.ts

import { callOpenAI } from '@/lib/openaiClient';
import { buildRepairPrompt } from './prompts/repair';
import type { AdvancedAuditResult, AuditValidationResult } from './types';
import logger from '@/lib/logger';
import { AdvancedAuditResultSchema } from './schema';

// ============================================================
// EXTRACT JSON
// ============================================================

function extractJSON(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return '';
  return text.substring(start, end + 1).replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

// ============================================================
// REPAIR FUNCTION
// ============================================================

export async function repairAudit(
  numberedCode: string,
  previousAudit: string,
  validationResult: AuditValidationResult,
  language: string,
  auditType: 'generic' | 'concurrency'
): Promise<AdvancedAuditResult | null> {
  const issues = validationResult.issues;
  const missingCoverage: string[] = [];
  for (const issue of issues) {
    if (issue.expectedCoverage && !missingCoverage.includes(issue.expectedCoverage)) {
      missingCoverage.push(issue.expectedCoverage);
    }
  }

  const prompt = buildRepairPrompt(
    numberedCode,
    previousAudit,
    issues,
    missingCoverage
  );

  try {
    const systemPrompt = 'You are an expert code auditor. Return only valid JSON.';
    const content = await callOpenAI(systemPrompt, prompt, {
      mode: 'advanced',
      responseFormat: 'text',
    });

    const extracted = extractJSON(content);
    if (!extracted) {
      logger.warn('[Repair] No JSON extracted from repair response');
      return null;
    }

    const parsed = JSON.parse(extracted) as unknown;

    // Validate with Zod before returning
    const result = AdvancedAuditResultSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    } else {
      logger.warn('[Repair] Repair produced invalid schema:', result.error.issues);
      return null;
    }
  } catch (error) {
    logger.error('[Repair] Repair failed:', error);
    return null;
  }
}