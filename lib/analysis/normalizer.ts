// lib/analysis/normalizer.ts

import type {
  AdvancedAuditResult,
  AuditFinding,
  AuditScorecard,
  ScoreItem,
  ImprovedCode,
} from './schema';
import {
  SeveritySchema,
  ConfidenceSchema,
  FindingCategorySchema,
  AuditTypeSchema,
  AuditStatusSchema,
  VerdictStatusSchema,
} from './schema';
import logger from '@/lib/logger';

// ============================================================
// Type Guards & Helpers
// ============================================================

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getSafeString(value: unknown, fallback: string = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function getSafeArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string').map((v) => v.trim())
    : [];
}

function getSafeObject(value: unknown, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  return isObject(value) ? value : fallback;
}

function sanitizeEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fallback: T
): T {
  if (typeof value === 'string' && allowedValues.includes(value as T)) {
    return value as T;
  }
  return fallback;
}

// ============================================================
// Score Normalization (0-100 Object)
// ============================================================

function normalizeScore(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return Math.max(0, Math.min(100, Math.round(parsed)));
    }
  }
  return fallback;
}

/**
 * ✅ نرمالایز کردن ScoreItem به ساختار Object (score, reason, relatedFindings)
 * این تابع هم ورودی عددی (Legacy) و هم ورودی Object را پشتیبانی می‌کند
 */
function normalizeScoreItem(value: unknown, fallback: number = 0): ScoreItem {
  // ===== اگر ورودی Object است =====
  if (isObject(value)) {
    const score = normalizeScore(value.score, fallback);
    const reason = typeof value.reason === 'string' ? value.reason.trim() : '';
    const relatedFindings = Array.isArray(value.relatedFindings)
      ? value.relatedFindings.filter((id): id is string => typeof id === 'string')
      : [];
    return { score, reason, relatedFindings };
  }

  // ===== اگر ورودی عددی است (Legacy 0-10 یا 0-100) =====
  const score = normalizeScore(value, fallback);
  return {
    score,
    reason: '',
    relatedFindings: [],
  };
}

/**
 * ✅ نرمالایز کردن کل Scorecard
 * تبدیل Legacy 0-10 یا 0-100 عددی به ساختار Object
 */
function normalizeScorecard(source: unknown): AuditScorecard {
  const input = getSafeObject(source);

  return {
    correctness: normalizeScoreItem(input.correctness, 0),
    concurrencySafety: normalizeScoreItem(input.concurrencySafety, 0),
    liveness: normalizeScoreItem(input.liveness, 0),
    errorHandling: normalizeScoreItem(input.errorHandling, 0),
    resourceManagement: normalizeScoreItem(input.resourceManagement, 0),
    maintainability: normalizeScoreItem(input.maintainability, 0),
    productionReadiness: normalizeScoreItem(input.productionReadiness, 0),
  };
}

// ============================================================
// ImprovedCode Normalization
// ============================================================

function normalizeImprovedCode(source: unknown): ImprovedCode {
  const input = getSafeObject(source);

  const available = typeof input.available === 'boolean' ? input.available : false;
  const code = typeof input.code === 'string' && input.code.trim().length > 0
    ? input.code
    : null;
  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';

  // ===== اعمال قوانین ImprovedCode =====
  if (available && !code) {
    // اگر available === true ولی code خالی است، آن را اصلاح می‌کنیم
    return {
      available: false,
      code: null,
      notes: notes || 'Code was expected but not provided.',
    };
  }

  if (!available && code) {
    // اگر available === false ولی code وجود دارد، آن را اصلاح می‌کنیم
    return {
      available: false,
      code: null,
      notes: notes || 'Code was provided but marked as unavailable.',
    };
  }

  return {
    available,
    code,
    notes: notes || (available ? 'Code patch provided.' : 'No safe patch available from context.'),
  };
}

// ============================================================
// Verdict Normalization (✅ ۶ وضعیت)
// ============================================================

function normalizeVerdict(source: unknown): { status: string; explanation: string } {
  const input = getSafeObject(source);

  const status = sanitizeEnum(
    input.status,
    VerdictStatusSchema.options,
    'requires-changes'
  );

  const explanation = getSafeString(input.explanation, 'Verdict explanation not provided.');

  return { status, explanation };
}

// ============================================================
// Language Normalization
// ============================================================

function normalizeLanguage(source: unknown): string {
  return getSafeString(source, 'unknown');
}

function normalizeResponseLanguage(source: unknown): 'English' | 'Persian' | undefined {
  const value = getSafeString(source);
  if (value === 'English' || value === 'Persian') {
    return value;
  }
  return undefined;
}

// ============================================================
// Main Normalizer
// ============================================================

export function normalizeAnalysisOutput(raw: unknown): AdvancedAuditResult {
  const startTime = Date.now();
  logger.debug('[Normalizer] Starting normalization');

  const input = getSafeObject(raw);

  // ===== 1. Findings =====
  const findingsSource =
    input.findings ??
    input.issues ??
    input.advancedFindings ??
    input.concurrencyFindings ??
    (isObject(input.analysis) ? input.analysis.findings : undefined);

  const findingsArray = getSafeArray<unknown>(findingsSource, []);
  const usedIds = new Set<string>();

  const normalizedFindings: AuditFinding[] = findingsArray
    .map((f: unknown, index: number) => {
      const finding = getSafeObject(f);

      const evidenceList = getSafeArray<unknown>(finding.evidence, []);
      const normalizedEvidence = evidenceList.map((e: unknown) => {
        const ev = getSafeObject(e);
        let startLine = typeof ev.startLine === 'number' ? ev.startLine : (typeof ev.line === 'number' ? ev.line : 1);
        let endLine = typeof ev.endLine === 'number' ? ev.endLine : startLine;
        if (endLine < startLine) {
          endLine = startLine;
        }
        return {
          startLine: Math.max(1, startLine),
          endLine: Math.max(1, endLine),
          code: getSafeString(ev.code, getSafeString(ev.snippet, '')),
          explanation: getSafeString(ev.explanation, getSafeString(ev.details, '')),
        };
      });

      let testToReproduce = null;
      const testRaw = finding.testToReproduce ?? finding.test;
      if (isObject(testRaw)) {
        const setup = getStringArray(testRaw.setup);
        const steps = getStringArray(testRaw.steps);
        if (steps.length > 0) {
          testToReproduce = {
            title: getSafeString(testRaw.title, 'Reproduction Test'),
            setup,
            steps,
            expectedResult: getSafeString(testRaw.expectedResult, ''),
          };
        }
      }

      let id = getSafeString(finding.id, `F-${String(index + 1).padStart(3, '0')}`);
      if (!/^F-\d{3,}$/.test(id)) {
        id = `F-${String(index + 1).padStart(3, '0')}`;
      }
      let counter = 1;
      let finalId = id;
      while (usedIds.has(finalId)) {
        const numericPart = id.replace('F-', '');
        const baseNum = parseInt(numericPart, 10) || 0;
        finalId = `F-${String(baseNum + counter).padStart(3, '0')}`;
        counter++;
      }
      usedIds.add(finalId);

      return {
        id: finalId,
        title: getSafeString(finding.title, getSafeString(finding.name, 'Untitled Finding')),
        category: sanitizeEnum(
          finding.category ?? finding.type,
          FindingCategorySchema.options,
          'other'
        ),
        severity: sanitizeEnum(
          finding.severity ?? finding.priority,
          SeveritySchema.options,
          'medium'
        ),
        confidence: sanitizeEnum(
          finding.confidence,
          ConfidenceSchema.options,
          'conditional'
        ),
        evidence: normalizedEvidence,
        executionPath: getStringArray(finding.executionPath) || getStringArray(finding.path) || [],
        triggerConditions: getStringArray(finding.triggerConditions) || getStringArray(finding.conditions) || [],
        consequence: getSafeString(finding.consequence, getSafeString(finding.impact, getSafeString(finding.effect, ''))),
        technicalExplanation: getSafeString(finding.technicalExplanation, getSafeString(finding.details, '')),
        remediation: getSafeString(finding.remediation, getSafeString(finding.fix, getSafeString(finding.solution, ''))),
        relatedSymbols: getStringArray(finding.relatedSymbols) || getStringArray(finding.symbols) || [],
        testToReproduce,
      };
    })
    .filter((finding) => finding.title.trim().length > 0 || finding.evidence.length > 0);

  // ===== 2. Execution Overview =====
  const overviewSource = getSafeObject(input.executionOverview, getSafeObject(input.overview, {}));
  const executionOverview = {
    entryPoints: getStringArray(overviewSource.entryPoints) || [],
    taskSubmissionPoints: getStringArray(overviewSource.taskSubmissionPoints) || [],
    blockingWaitPoints: getStringArray(overviewSource.blockingWaitPoints) || [],
    sharedResources: getStringArray(overviewSource.sharedResources) || [],
    resourceLifecycle: getStringArray(overviewSource.resourceLifecycle) || [],
  };

  // ===== 3. Scorecard (✅ ساختار Object) =====
  const scorecardSource = getSafeObject(
    input.scorecard_new ??
    input.scorecard ??
    input.scorecardLegacy ??
    {}
  );
  const scorecard = normalizeScorecard(scorecardSource);

  // ===== 4. Verdict (✅ ۶ وضعیت) =====
  const verdictSource = getSafeObject(input.verdict, getSafeObject(input.finalVerdict, {}));
  const verdict = normalizeVerdict(verdictSource);

  // ===== 5. Complexity =====
  const complexitySource = getSafeObject(input.complexity, {});
  const complexity = {
    time: getSafeString(complexitySource.time, 'unknown'),
    space: getSafeString(complexitySource.space, 'unknown'),
    resourceGrowth: getSafeString(complexitySource.resourceGrowth, 'unknown'),
    assumptions: getStringArray(complexitySource.assumptions) || [],
  };

  // ===== 6. ImprovedCode (✅ ساختار کامل) =====
  const improvedCodeSource = getSafeObject(
    input.improvedCode ??
    input.improved_code ??
    {}
  );
  const improvedCode = normalizeImprovedCode(improvedCodeSource);

  // ===== 7. linkedin_post =====
  let linkedinPost =
    typeof input.linkedin_post === 'string'
      ? input.linkedin_post.trim()
      : typeof input.linkedinPost === 'string'
        ? input.linkedinPost.trim()
        : '';

  if (!linkedinPost) {
    linkedinPost = 'Check out this code analysis! #Zbloue';
  }

  // ===== 8. Language =====
  const language = normalizeLanguage(input.language);
  const responseLanguage = normalizeResponseLanguage(input.responseLanguage);

  // ===== 9. Other arrays =====
  const architecturalObservations = getSafeArray<unknown>(input.architecturalObservations, [])
    .map((obs: unknown) => {
      const o = getSafeObject(obs);
      const title = getSafeString(o.title, '');
      const explanation = getSafeString(o.explanation, '');
      const allFindingIds = new Set(normalizedFindings.map((f) => f.id));
      const relatedFindingIds = getStringArray(o.relatedFindingIds).filter((id) => allFindingIds.has(id));
      return { title, explanation, relatedFindingIds };
    })
    .filter((obs) => obs.title.length > 0 || obs.explanation.length > 0);

  const recommendedActions = getSafeArray<unknown>(input.recommendedActions, [])
    .map((act: unknown) => {
      const a = getSafeObject(act);
      let priority = typeof a.priority === 'number' && a.priority > 0 ? Math.round(a.priority) : 1;
      const severity = sanitizeEnum(a.severity, SeveritySchema.options, 'medium');
      const title = getSafeString(a.title, '');
      const action = getSafeString(a.action, '');
      const allFindingIds = new Set(normalizedFindings.map((f) => f.id));
      const relatedFindingIds = getStringArray(a.relatedFindingIds).filter((id) => allFindingIds.has(id));
      return { priority, severity, title, action, relatedFindingIds };
    })
    .filter((act) => act.title.length > 0 || act.action.length > 0)
    .sort((a, b) => a.priority - b.priority)
    .map((act, index) => ({ ...act, priority: index + 1 }));

  const suggestedTests = getSafeArray<unknown>(
    input.suggestedTests ??
    input.suggested_tests ??
    input.suggestedTestsNew ??
    input.suggested_tests_new ??
    []
  )
    .map((test: unknown) => {
      const t = getSafeObject(test);
      const title = getSafeString(t.title, getSafeString(t.name, ''));
      const purpose = getSafeString(t.purpose, '');
      const setup = getStringArray(t.setup) || [];
      const steps = getStringArray(t.steps) || [];
      const expectedResult = getSafeString(t.expectedResult, getSafeString(t.expectedOutput, ''));
      const allFindingIds = new Set(normalizedFindings.map((f) => f.id));
      const relatedFindingIds = getStringArray(t.relatedFindingIds).filter((id) => allFindingIds.has(id));
      return { title, purpose, setup, steps, expectedResult, relatedFindingIds };
    })
    .filter((test) => test.title.length > 0 || test.purpose.length > 0);

  const limitations = getStringArray(input.limitations) || [];

  // ===== 10. Build final result =====
  const status = sanitizeEnum(input.status, AuditStatusSchema.options, 'complete');
  const auditType = sanitizeEnum(input.auditType, AuditTypeSchema.options, 'generic');
  const summary = getSafeString(input.summary, getSafeString(input.highLevelSummary, 'No summary provided.'));
  const schemaVersion: '1.0' = '1.0';

  const result: AdvancedAuditResult = {
    schemaVersion,
    auditType,
    status,
    language,
    summary,
    executionOverview,
    findings: normalizedFindings,
    architecturalObservations,
    recommendedActions,
    suggestedTests,
    complexity,
    scorecard,
    verdict,
    limitations,
    improvedCode,
    linkedin_post: linkedinPost,
  };

  // ===== اضافه کردن responseLanguage در صورت وجود =====
  if (responseLanguage) {
    (result as any).responseLanguage = responseLanguage;
  }

  const duration = Date.now() - startTime;
  logger.debug('[Normalizer] Completed in', duration, 'ms, findings:', normalizedFindings.length);

  return result;
}