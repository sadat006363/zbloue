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
// Type aliases derived from schemas
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
// 🔥 Helper: Create minimal audit from existing data
// ============================================================

function createMinimalAuditFromExisting(
  previousAudit: string,
  language: string,
  auditType: 'generic' | 'concurrency'
): AdvancedAuditResult | null {
  try {
    const parsed = JSON.parse(previousAudit);
    const summary = typeof parsed.summary === 'string' ? parsed.summary : 'Partial analysis from repair fallback.';
    const title = typeof parsed.title === 'string' ? parsed.title : 'Code Analysis (Repaired)';

    const minimal: AdvancedAuditResult = {
      schemaVersion: '1.0',
      auditType: 'comprehensive',
      appliedSpecializations: auditType === 'concurrency' ? ['concurrency'] : [],
      completionStatus: 'partially-complete',
      repairApplied: true,
      title: title,
      language: language || 'unknown',
      responseLanguage: typeof parsed.responseLanguage === 'string' ? (parsed.responseLanguage as any) : 'English',
      analysisCoverage: [],
      summary: summary,
      executionOverview: {
        entryPoints: [],
        taskSubmissionPoints: [],
        blockingWaitPoints: [],
        sharedResources: [],
        resourceLifecycle: [],
      },
      findings: Array.isArray(parsed.findings) ? parsed.findings.map((f: any) => ({
        id: f.id || 'F-001',
        title: f.title || 'Untitled Finding',
        category: f.category || 'other',
        mechanisms: Array.isArray(f.mechanisms) ? f.mechanisms : [],
        severity: f.severity || 'medium',
        confidence: f.confidence || 'conditional',
        evidence: Array.isArray(f.evidence) ? f.evidence : [],
        executionPath: Array.isArray(f.executionPath) ? f.executionPath : [],
        triggerConditions: Array.isArray(f.triggerConditions) ? f.triggerConditions : [],
        consequence: f.consequence || 'No consequence provided.',
        technicalExplanation: f.technicalExplanation || 'No technical explanation provided.',
        remediation: f.remediation || 'No remediation provided.',
        relatedSymbols: Array.isArray(f.relatedSymbols) ? f.relatedSymbols : [],
        testToReproduce: f.testToReproduce || null,
      })) : [],
      architecturalObservations: Array.isArray(parsed.architecturalObservations) ? parsed.architecturalObservations : [],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
      suggestedTests: Array.isArray(parsed.suggestedTests) ? parsed.suggestedTests : [],
      complexity: typeof parsed.complexity === 'object' && parsed.complexity !== null ? parsed.complexity : {
        applicable: false,
        expression: null,
        explanation: null,
        variables: [],
        assumptions: [],
      },
      scorecard: typeof parsed.scorecard === 'object' && parsed.scorecard !== null ? parsed.scorecard : {
        correctness: { applicable: false, score: null, reason: 'No data', relatedFindings: [] },
        concurrencySafety: { applicable: false, score: null, reason: 'No data', relatedFindings: [] },
        liveness: { applicable: false, score: null, reason: 'No data', relatedFindings: [] },
        errorHandling: { applicable: false, score: null, reason: 'No data', relatedFindings: [] },
        resourceManagement: { applicable: false, score: null, reason: 'No data', relatedFindings: [] },
        maintainability: { applicable: false, score: null, reason: 'No data', relatedFindings: [] },
        productionReadiness: { applicable: false, score: null, reason: 'No data', relatedFindings: [] },
      },
      verdict: typeof parsed.verdict === 'object' && parsed.verdict !== null ? parsed.verdict : {
        status: 'requires-changes',
        explanation: 'Partial analysis due to repair failure.',
      },
      limitations: ['Analysis is incomplete due to repair failure.'],
      improvedCode: typeof parsed.improvedCode === 'object' && parsed.improvedCode !== null ? parsed.improvedCode : {
        available: false,
        code: null,
        notes: 'No improved code available.',
      },
      linkedin_post: typeof parsed.linkedin_post === 'string' ? parsed.linkedin_post : 'Check out this code analysis! #Zbloue',
    };

    // اعتبارسنجی نهایی (با انعطاف‌پذیری)
    try {
      return AdvancedAuditResultSchema.parse(minimal);
    } catch {
      // اگر باز هم خطا داشت، همان minimal را برگردان (با لاگ)
      logger.warn('[Repair] Minimal audit also failed validation, returning as-is');
      return minimal as AdvancedAuditResult;
    }
  } catch (error) {
    logger.error('[Repair] Failed to create minimal audit:', error);
    return null;
  }
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
    const issues = validationResult.issues;
    const missingCoverage: string[] = [];
    for (const issue of issues) {
      if (issue.expectedCoverage && !missingCoverage.includes(issue.expectedCoverage)) {
        missingCoverage.push(issue.expectedCoverage);
      }
    }

    const promptContext: PromptContext = {
      sourceLanguage: language,
      responseLanguage: 'English',
      numberedCode,
      rawCode: numberedCode,
    };

    const prompt = buildRepairPrompt(
      promptContext,
      previousAudit,
      issues,
      missingCoverage
    );

    const systemPrompt = 'You are an expert code auditor. Return only valid JSON. Do not use Markdown fences or any text outside the JSON.';

    const rawContent = await callOpenAI(systemPrompt, prompt, {
      mode: 'advanced',
      responseFormat: 'text',
    });

    const parseResult = parseModelOutput(rawContent, AdvancedAuditResultSchema, {
      requestId: `repair-${Date.now()}`,
      logErrors: true,
    });

    if (!parseResult.success || !parseResult.data) {
      logger.warn('[Repair] Parse failed:', parseResult.error);
      // 🔥 Fallback: ساخت یک audit حداقلی از داده‌های موجود
      return createMinimalAuditFromExisting(previousAudit, language, auditType);
    }

    const repaired = parseResult.data;

    const semanticResult = validateSemanticIntegrity(repaired);
    if (!semanticResult.isValid) {
      logger.warn('[Repair] Semantic validation failed:', semanticResult.errors);
      // 🔥 Fallback: ساخت یک audit حداقلی
      return createMinimalAuditFromExisting(previousAudit, language, auditType);
    }

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

    if (!canonicalRepaired.analysisCoverage || canonicalRepaired.analysisCoverage.length === 0) {
      logger.warn('[Repair] analysisCoverage missing in repaired output; will be filled by normalizer');
    }

    const finalValidation = AdvancedAuditResultSchema.safeParse(canonicalRepaired);
    if (!finalValidation.success) {
      logger.error('[Repair] Final validation failed:', finalValidation.error.issues);
      // 🔥 Fallback: ساخت یک audit حداقلی
      return createMinimalAuditFromExisting(previousAudit, language, auditType);
    }

    const duration = Date.now() - startTime;
    logger.info('[Repair] Completed successfully in', duration, 'ms');

    return finalValidation.data;
  } catch (error) {
    logger.error('[Repair] Failed:', error);
    // 🔥 Fallback نهایی
    return createMinimalAuditFromExisting(previousAudit, language, auditType);
  }
}

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
    return createMinimalAuditFromExisting(previousAudit, language, auditType);
  }
}

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
    const promptContext: PromptContext = {
      sourceLanguage: language,
      responseLanguage: 'English',
      numberedCode,
      rawCode: numberedCode,
    };

    const missingCoverage: string[] = [];
    const issues: any[] = [];

    const prompt = buildRepairPrompt(
      promptContext,
      previousAudit,
      issues,
      missingCoverage
    );

    const systemPrompt = 'You are an expert code auditor. Return only valid JSON that matches the canonical schema. Do not use Markdown fences or any text outside the JSON.';

    const rawContent = await callOpenAI(systemPrompt, prompt, {
      mode: 'advanced',
      responseFormat: 'text',
    });

    const parseResult = parseModelOutput(rawContent, AdvancedAuditResultSchema, {
      requestId: `repair-structural-${Date.now()}`,
      logErrors: true,
    });

    if (!parseResult.success || !parseResult.data) {
      logger.warn('[Repair] Structural repair parse failed:', parseResult.error);
      return createMinimalAuditFromExisting(previousAudit, language, auditType);
    }

    const repaired = parseResult.data;

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

    const finalValidation = AdvancedAuditResultSchema.safeParse(canonicalRepaired);
    if (!finalValidation.success) {
      logger.error('[Repair] Structural repair final validation failed:', finalValidation.error.issues);
      return createMinimalAuditFromExisting(previousAudit, language, auditType);
    }

    const duration = Date.now() - startTime;
    logger.info('[Repair] Structural repair completed in', duration, 'ms');

    return finalValidation.data;
  } catch (error) {
    logger.error('[Repair] Structural repair failed:', error);
    return createMinimalAuditFromExisting(previousAudit, language, auditType);
  }
}