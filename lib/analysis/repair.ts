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

type CompletionStatus = z.infer<typeof CompletionStatusSchema>;
type AppliedSpecialization = z.infer<typeof SpecializationSchema>;

function extractJSON(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return '';
  return text.substring(start, end + 1).replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

const ALL_DIMENSIONS = [
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

type Dimension = typeof ALL_DIMENSIONS[number];

function getDefaultAnalysisCoverage(): any[] {
  return ALL_DIMENSIONS.map(dim => ({
    dimension: dim as any,
    status: 'analyzed',
    summary: `Analysis of ${dim} dimension.`,
    limitation: null,
  }));
}

function getDefaultExecutionOverview(): any {
  return {
    entryPoints: [],
    taskSubmissionPoints: [],
    blockingWaitPoints: [],
    sharedResources: [],
    resourceLifecycle: [],
  };
}

// ============================================================
// 🔥 تابع کمکی برای تبدیل relatedFindings → relatedFindingIds
// ============================================================

function convertRelatedFindings(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };
  if (Array.isArray(obj.relatedFindings)) {
    result.relatedFindingIds = obj.relatedFindings;
    delete result.relatedFindings;
  }
  if (Array.isArray(obj.relatedFindingIds)) {
    result.relatedFindingIds = obj.relatedFindingIds;
  }
  return result;
}

// ============================================================
// 🔥 تابع کمکی برای پاکسازی فیلدهای اضافی و تنظیم پرچم‌ها
// ============================================================

function sanitizeRepairedData(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const cleaned = { ...data };

  // 1. اطمینان از schemaVersion
  cleaned.schemaVersion = '1.0.0';

  // 2. تبدیل linkedin_post → linkedinPost
  if (cleaned.linkedin_post && !cleaned.linkedinPost) {
    cleaned.linkedinPost = cleaned.linkedin_post;
  }
  delete cleaned.linkedin_post;

  // 3. حذف responseLanguage
  delete cleaned.responseLanguage;

  // 4. تبدیل relatedFindings → relatedFindingIds در scorecard
  if (cleaned.scorecard && typeof cleaned.scorecard === 'object') {
    const scorecard = cleaned.scorecard;
    const categories = [
      'correctness',
      'concurrencySafety',
      'liveness',
      'errorHandling',
      'resourceManagement',
      'maintainability',
      'productionReadiness',
    ];
    for (const cat of categories) {
      if (scorecard[cat] && typeof scorecard[cat] === 'object') {
        scorecard[cat] = convertRelatedFindings(scorecard[cat]);
      }
    }
  }

  // 5. تبدیل relatedFindings → relatedFindingIds در architecturalObservations
  if (Array.isArray(cleaned.architecturalObservations)) {
    cleaned.architecturalObservations = cleaned.architecturalObservations.map((obs: any) =>
      convertRelatedFindings(obs)
    );
  }

  // 6. تبدیل relatedFindings → relatedFindingIds در recommendedActions
  if (Array.isArray(cleaned.recommendedActions)) {
    cleaned.recommendedActions = cleaned.recommendedActions.map((action: any) =>
      convertRelatedFindings(action)
    );
  }

  // 7. تبدیل relatedFindings → relatedFindingIds در suggestedTests
  if (Array.isArray(cleaned.suggestedTests)) {
    cleaned.suggestedTests = cleaned.suggestedTests.map((test: any) =>
      convertRelatedFindings(test)
    );
  }

  // 🔥 8. تنظیم repairApplied بر اساس وجود بهبود واقعی
  if (cleaned.improvedCode && cleaned.improvedCode.available === true) {
    cleaned.repairApplied = true;
  } else {
    cleaned.repairApplied = false;
  }

  // 🔥 9. تنظیم completionStatus بر اساس کامل بودن داده‌ها
  const hasFindings = Array.isArray(cleaned.findings) && cleaned.findings.length > 0;
  const hasScorecard = cleaned.scorecard && typeof cleaned.scorecard === 'object';
  const hasVerdict = cleaned.verdict && typeof cleaned.verdict === 'object';
  const hasSeriousLimitation = Array.isArray(cleaned.limitations) && 
    cleaned.limitations.some((l: string) => 
      l.includes('incomplete') || 
      l.includes('repair failure') ||
      l.includes('partial')
    );

  if (hasFindings && hasScorecard && hasVerdict && !hasSeriousLimitation) {
    cleaned.completionStatus = 'complete';
  } else {
    cleaned.completionStatus = 'partially-complete';
  }

  return cleaned;
}

function createMinimalAuditFromExisting(
  previousAudit: string,
  language: string,
  auditType: 'generic' | 'concurrency'
): AdvancedAuditResult | null {
  try {
    const parsed = JSON.parse(previousAudit);
    
    const summary = typeof parsed.summary === 'string' && parsed.summary.length > 0 
      ? parsed.summary 
      : 'Partial analysis from repair fallback.';
    
    const title = typeof parsed.title === 'string' && parsed.title.length > 0 
      ? parsed.title 
      : 'Code Analysis (Repaired)';

    const findings = Array.isArray(parsed.findings) 
      ? parsed.findings.map((f: any) => ({
          id: f.id || `F-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          title: f.title || 'Untitled Finding',
          category: f.category || 'other',
          mechanisms: Array.isArray(f.mechanisms) ? f.mechanisms : [],
          severity: f.severity || 'medium',
          confidence: f.confidence || 'conditional',
          evidence: Array.isArray(f.evidence) ? f.evidence : [],
          executionPath: Array.isArray(f.executionPath) ? f.executionPath : [],
          triggerConditions: Array.isArray(f.triggerConditions) ? f.triggerConditions : [],
          consequence: f.consequence || undefined,
          technicalExplanation: f.technicalExplanation || undefined,
          remediation: f.remediation || undefined,
          relatedSymbols: Array.isArray(f.relatedSymbols) ? f.relatedSymbols : [],
          testToReproduce: f.testToReproduce || null,
        }))
      : [];

    const scorecard = typeof parsed.scorecard === 'object' && parsed.scorecard !== null 
      ? parsed.scorecard 
      : {
          correctness: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] },
          concurrencySafety: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] },
          liveness: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] },
          errorHandling: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] },
          resourceManagement: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] },
          maintainability: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] },
          productionReadiness: { applicable: false, score: null, reason: 'No data', relatedFindingIds: [] },
        };

    const verdict = typeof parsed.verdict === 'object' && parsed.verdict !== null 
      ? parsed.verdict 
      : {
          status: 'requires-changes',
          explanation: 'Partial analysis due to repair failure.',
        };

    const improvedCode = typeof parsed.improvedCode === 'object' && parsed.improvedCode !== null 
      ? parsed.improvedCode 
      : {
          available: false,
          code: null,
          notes: 'No improved code available.',
        };

    const complexity = typeof parsed.complexity === 'object' && parsed.complexity !== null 
      ? parsed.complexity 
      : {
          applicable: false,
          expression: null,
          explanation: null,
          variables: [],
          assumptions: [],
        };

    const linkedinPost = typeof parsed.linkedinPost === 'string' 
      ? parsed.linkedinPost 
      : (typeof parsed.linkedin_post === 'string' ? parsed.linkedin_post : 'Check out this code analysis! #Zbloue');

    let analysisCoverage = Array.isArray(parsed.analysisCoverage) ? parsed.analysisCoverage : [];
    if (analysisCoverage.length === 0) {
      analysisCoverage = getDefaultAnalysisCoverage();
    }

    let executionOverview = parsed.executionOverview || {};
    if (Object.keys(executionOverview).length === 0) {
      executionOverview = getDefaultExecutionOverview();
    }

    const minimal: AdvancedAuditResult = {
      schemaVersion: '1.0.0',
      auditType: 'comprehensive',
      appliedSpecializations: auditType === 'concurrency' ? ['concurrency'] : [],
      completionStatus: 'partially-complete',
      repairApplied: false,
      title: title,
      language: language || 'unknown',
      summary: summary,
      executionOverview: executionOverview,
      findings: findings,
      architecturalObservations: Array.isArray(parsed.architecturalObservations) ? parsed.architecturalObservations : [],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
      suggestedTests: Array.isArray(parsed.suggestedTests) ? parsed.suggestedTests : [],
      complexity: complexity,
      scorecard: scorecard,
      verdict: verdict,
      limitations: ['Analysis is incomplete due to repair failure.'],
      improvedCode: improvedCode,
      linkedinPost: linkedinPost,
      analysisCoverage: analysisCoverage,
    };

    try {
      return AdvancedAuditResultSchema.parse(minimal);
    } catch {
      logger.warn('[Repair] Minimal audit also failed validation, returning as-is');
      return minimal as AdvancedAuditResult;
    }
  } catch (error) {
    logger.error('[Repair] Failed to create minimal audit:', error);
    return null;
  }
}

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

    const systemPrompt = `You are an expert code auditor. 
IMPORTANT: Your task is to REPAIR the structure of the JSON, NOT to rewrite the content.

🔴 CRITICAL RULES (MUST FOLLOW):
1. schemaVersion MUST be "1.0.0" (NOT "1.0")
2. Use "linkedinPost" (camelCase) - NOT "linkedin_post"
3. Use "relatedFindingIds" (camelCase) - NOT "relatedFindings"
4. Do NOT include "responseLanguage" field
5. PRESERVE all valid content (titles, descriptions, explanations, remediations)
6. ONLY fix structural issues (missing fields, invalid types, empty arrays)
7. Do NOT replace valid content with placeholder text like "No ... provided"
8. Return only valid JSON. Do not use Markdown fences.

CORRECT FIELD NAMES:
- linkedinPost (not linkedin_post)
- relatedFindingIds (not relatedFindings)
- schemaVersion: "1.0.0" (not "1.0")

EXAMPLE OF CORRECT OUTPUT:
{
  "schemaVersion": "1.0.0",
  "linkedinPost": "Professional summary...",
  "scorecard": {
    "correctness": {
      "applicable": true,
      "score": 70,
      "reason": "...",
      "relatedFindingIds": ["F-001"]
    }
  }
}`;

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
      return createMinimalAuditFromExisting(previousAudit, language, auditType);
    }

    const repaired = parseResult.data;

    // 🔥 🔥 🔥 FORCE CORRECT FIELD NAMES 🔥 🔥 🔥
    const sanitized = sanitizeRepairedData(repaired);

    const semanticResult = validateSemanticIntegrity(sanitized);
    if (!semanticResult.isValid) {
      logger.warn('[Repair] Semantic validation failed:', semanticResult.errors);
      return createMinimalAuditFromExisting(previousAudit, language, auditType);
    }

    // 🔥 اصلاح: اطمینان از schemaVersion صحیح و حذف فیلدهای اضافی
    const canonicalRepaired: AdvancedAuditResult = {
      ...sanitized,
      schemaVersion: '1.0.0',
      auditType: 'comprehensive',
      completionStatus: sanitized.completionStatus || 'complete',
      repairApplied: sanitized.repairApplied || false,
      appliedSpecializations: sanitized.appliedSpecializations && sanitized.appliedSpecializations.length > 0
        ? sanitized.appliedSpecializations
        : (auditType === 'concurrency' ? ['concurrency'] : []),
      language: language,
    };

    if (!canonicalRepaired.analysisCoverage || canonicalRepaired.analysisCoverage.length === 0) {
      logger.warn('[Repair] analysisCoverage missing in repaired output; will be filled by normalizer');
    }

    const finalValidation = AdvancedAuditResultSchema.safeParse(canonicalRepaired);
    if (!finalValidation.success) {
      logger.error('[Repair] Final validation failed:', finalValidation.error.issues);
      return createMinimalAuditFromExisting(previousAudit, language, auditType);
    }

    const duration = Date.now() - startTime;
    logger.info('[Repair] Completed successfully in', duration, 'ms');

    return finalValidation.data;
  } catch (error) {
    logger.error('[Repair] Failed:', error);
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

    const systemPrompt = `You are an expert code auditor. 
IMPORTANT: Your task is to REPAIR the structure of the JSON, NOT to rewrite the content.

🔴 CRITICAL RULES (MUST FOLLOW):
1. schemaVersion MUST be "1.0.0" (NOT "1.0")
2. Use "linkedinPost" (camelCase) - NOT "linkedin_post"
3. Use "relatedFindingIds" (camelCase) - NOT "relatedFindings"
4. Do NOT include "responseLanguage" field
5. PRESERVE all valid content (titles, descriptions, explanations, remediations)
6. ONLY fix structural issues (missing fields, invalid types, empty arrays)
7. Do NOT replace valid content with placeholder text like "No ... provided"
8. Return only valid JSON. Do not use Markdown fences.

CORRECT FIELD NAMES:
- linkedinPost (not linkedin_post)
- relatedFindingIds (not relatedFindings)
- schemaVersion: "1.0.0" (not "1.0")`;

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
    const sanitized = sanitizeRepairedData(repaired);

    const canonicalRepaired: AdvancedAuditResult = {
      ...sanitized,
      schemaVersion: '1.0.0',
      auditType: 'comprehensive',
      completionStatus: sanitized.completionStatus || 'complete',
      repairApplied: sanitized.repairApplied || false,
      appliedSpecializations: sanitized.appliedSpecializations && sanitized.appliedSpecializations.length > 0
        ? sanitized.appliedSpecializations
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