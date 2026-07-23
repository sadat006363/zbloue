// lib/analysis/repair.ts

import { callOpenAI } from '@/lib/openaiClient';
import { buildRepairPrompt } from './prompts/repair';
import { AdvancedAuditResultSchema, type AdvancedAuditResult } from './schema';
import type { AuditValidationResult } from './types';
import { validateSemanticIntegrity } from './semantic-validator';
import { parseModelOutput } from './parse-model-output';
import { type PromptContext } from './prompt-context';
import logger from '@/lib/logger';

// ============================================================
// HELPER: EXTRACT JSON (Fallback)
// ============================================================

function extractJSON(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return '';
  return text.substring(start, end + 1).replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

// ============================================================
// MAIN REPAIR FUNCTION
// ============================================================

export async function repairAudit(
  numberedCode: string,
  previousAudit: string,
  validationResult: AuditValidationResult,
  language: string,
  auditType: 'generic' | 'concurrency'
): Promise<AdvancedAuditResult | null> {
  const startTime = Date.now();
  logger.debug('[Repair] Starting repair attempt');

  try {
    // ===== 1. Prepare repair context =====
    const issues = validationResult.issues;
    const missingCoverage: string[] = [];
    for (const issue of issues) {
      if (issue.expectedCoverage && !missingCoverage.includes(issue.expectedCoverage)) {
        missingCoverage.push(issue.expectedCoverage);
      }
    }

    // ===== 2. Build PromptContext =====
    const promptContext: PromptContext = {
      sourceLanguage: language,
      responseLanguage: 'English',
      numberedCode,
      rawCode: numberedCode, // برای تعمیر، کد شماره‌گذاری‌شده کافی است
    };

    // ===== 3. Build repair prompt =====
    const prompt = buildRepairPrompt(
      promptContext,
      previousAudit,
      issues,
      missingCoverage
    );

    // ===== 4. Call AI =====
    const systemPrompt = 'You are an expert code auditor. Return only valid JSON. Do not use Markdown fences or any text outside the JSON.';

    const rawContent = await callOpenAI(systemPrompt, prompt, {
      mode: 'advanced',
      responseFormat: 'text',
    });

    // ===== 5. Parse and validate =====
    const parseResult = parseModelOutput(rawContent, AdvancedAuditResultSchema, {
      requestId: `repair-${Date.now()}`,
      logErrors: true,
    });

    if (!parseResult.success || !parseResult.data) {
      logger.warn('[Repair] Parse failed:', parseResult.error);
      return null;
    }

    const repaired = parseResult.data;

    // ===== 6. Semantic validation =====
    const semanticResult = validateSemanticIntegrity(repaired);
    if (!semanticResult.isValid) {
      logger.warn('[Repair] Semantic validation failed:', semanticResult.errors);
      return null;
    }

    // ===== 7. Ensure auditType matches =====
    if (repaired.auditType !== auditType) {
      logger.warn('[Repair] Audit type mismatch, correcting:', {
        expected: auditType,
        actual: repaired.auditType,
      });
      // اصلاح auditType
      (repaired as any).auditType = auditType;
    }

    // ===== 8. Ensure status is 'repaired' =====
    if (repaired.status !== 'repaired') {
      logger.debug('[Repair] Setting status to repaired');
      (repaired as any).status = 'repaired';
    }

    const duration = Date.now() - startTime;
    logger.info('[Repair] Completed successfully in', duration, 'ms');

    return repaired;
  } catch (error) {
    logger.error('[Repair] Failed:', error);
    return null;
  }
}

/**
 * نسخه ساده‌شده Repair با try-catch و لاگ‌گیری
 * برای استفاده در Pipeline
 */
export async function repairAuditSafe(
  numberedCode: string,
  previousAudit: string,
  validationResult: AuditValidationResult,
  language: string,
  auditType: 'generic' | 'concurrency'
): Promise<AdvancedAuditResult | null> {
  try {
    return await repairAudit(
      numberedCode,
      previousAudit,
      validationResult,
      language,
      auditType
    );
  } catch (error) {
    logger.error('[RepairSafe] Unhandled error:', error);
    return null;
  }
}