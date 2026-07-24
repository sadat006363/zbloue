// lib/analysis/repair.ts

import { z } from 'zod';
import { callOpenAI } from '@/lib/openaiClient';
import { buildRepairPrompt } from './prompts/repair';
import {
  AdvancedAuditResultSchema,
  CompletionStatusSchema,
  SpecializationSchema,
  type AdvancedAuditResult,
} from './schema';
import type { AuditValidationResult } from './types';
import { validateSemanticIntegrity } from './semantic-validator';
import { parseModelOutput } from './parse-model-output';
import { type PromptContext } from './prompt-context';
import logger from '@/lib/logger';

// ============================================================
// Type aliases from schemas
// ============================================================

type CompletionStatus = z.infer<typeof CompletionStatusSchema>;
type AppliedSpecialization = z.infer<typeof SpecializationSchema>;

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
// MAIN REPAIR FUNCTION (UPDATED FOR CANONICAL SCHEMA)
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
      rawCode: numberedCode,
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

    // ===== 7. Ensure canonical fields are correctly set =====
    const canonicalRepaired: AdvancedAuditResult = {
      ...repaired,
      schemaVersion: '1.0',
      auditType: 'comprehensive',
      completionStatus: 'complete',
      repairApplied: true,
      appliedSpecializations: repaired.appliedSpecializations && repaired.appliedSpecializations.length > 0
        ? repaired.appliedSpecializations
        : (auditType === 'concurrency' ? ['concurrency'] : []),
      language: language,
    };

    // Ensure analysisCoverage is present
    if (!canonicalRepaired.analysisCoverage || canonicalRepaired.analysisCoverage.length === 0) {
      logger.warn('[Repair] analysisCoverage missing in repaired output; will be filled by normalizer');
    }

    // ===== 8. Final validation with Zod =====
    const finalValidation = AdvancedAuditResultSchema.safeParse(canonicalRepaired);
    if (!finalValidation.success) {
      logger.error('[Repair] Final validation failed:', finalValidation.error.issues);
      return null;
    }

    const duration = Date.now() - startTime;
    logger.info('[Repair] Completed successfully in', duration, 'ms');

    return finalValidation.data;
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

/**
 * تعمیر خروجی با تمرکز بر ساختار (بدون تغییر معنا)
 * این تابع برای مواردی استفاده می‌شود که خروجی Structurally Invalid است
 */
export async function repairStructureOnly(
  numberedCode: string,
  previousAudit: string,
  validationIssues: any[],
  language: string,
  auditType: 'generic' | 'concurrency'
): Promise<AdvancedAuditResult | null> {
  const startTime = Date.now();
  logger.debug('[Repair] Starting structural repair attempt');

  try {
    // ===== 1. Build minimal repair context =====
    const promptContext: PromptContext = {
      sourceLanguage: language,
      responseLanguage: 'English',
      numberedCode,
      rawCode: numberedCode,
    };

    // ===== 2. Create a simpler repair prompt focusing on structure =====
    const missingCoverage: string[] = [];
    const issues: any[] = [];

    // ===== 3. Build repair prompt =====
    const prompt = buildRepairPrompt(
      promptContext,
      previousAudit,
      issues,
      missingCoverage
    );

    // ===== 4. Call AI =====
    const systemPrompt = 'You are an expert code auditor. Return only valid JSON that matches the canonical schema. Do not use Markdown fences or any text outside the JSON.';

    const rawContent = await callOpenAI(systemPrompt, prompt, {
      mode: 'advanced',
      responseFormat: 'text',
    });

    // ===== 5. Parse =====
    const parseResult = parseModelOutput(rawContent, AdvancedAuditResultSchema, {
      requestId: `repair-structural-${Date.now()}`,
      logErrors: true,
    });

    if (!parseResult.success || !parseResult.data) {
      logger.warn('[Repair] Structural repair parse failed:', parseResult.error);
      return null;
    }

    const repaired = parseResult.data;

    // ===== 6. Ensure canonical fields =====
    const canonicalRepaired: AdvancedAuditResult = {
      ...repaired,
      schemaVersion: '1.0',
      auditType: 'comprehensive',
      completionStatus: 'complete',
      repairApplied: true,
      appliedSpecializations: repaired.appliedSpecializations && repaired.appliedSpecializations.length > 0
        ? repaired.appliedSpecializations
        : (auditType === 'concurrency' ? ['concurrency'] : []),
      language: language,
    };

    // ===== 7. Final validation =====
    const finalValidation = AdvancedAuditResultSchema.safeParse(canonicalRepaired);
    if (!finalValidation.success) {
      logger.error('[Repair] Structural repair final validation failed:', finalValidation.error.issues);
      return null;
    }

    const duration = Date.now() - startTime;
    logger.info('[Repair] Structural repair completed in', duration, 'ms');

    return finalValidation.data;
  } catch (error) {
    logger.error('[Repair] Structural repair failed:', error);
    return null;
  }
}