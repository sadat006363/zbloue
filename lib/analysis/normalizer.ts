// lib/analysis/normalizer.ts

import { z } from 'zod';
import {
  AdvancedAuditResultSchema,
  SeveritySchema,
  ConfidenceSchema,
  BroadCategorySchema,
  MechanismSchema,
  VerdictSchema,
  VerdictStatusSchema,
  ComplexitySchema,
  ImprovedCodeSchema,
  CompletionStatusSchema,
  SpecializationSchema,
  AnalysisCoverageItemSchema,
  type AdvancedAuditResult,
  type AuditFinding,
  type AuditScorecard,
  type ScoreItem,
  type ImprovedCode,
  type VerdictStatus,
  type Complexity,
  type AnalysisCoverageItem,
  type ArchitecturalObservation,
  type SuggestedTest,
  type ExecutionOverview,
} from '@/lib/analysis/schema';

import logger from '@/lib/logger';

type CompletionStatus = z.infer<typeof CompletionStatusSchema>;
type AppliedSpecialization = z.infer<typeof SpecializationSchema>;
type Mechanism = z.infer<typeof MechanismSchema>;

const DEFAULT_TITLE = 'Code Analysis Report';
const DEFAULT_LINKEDIN_POST = 'Check out this code analysis! #Zbloue';

// ============================================================
// 🔥 Helper: تشخیص وجود کد مرتبط با هر بُعد
// ============================================================

function detectRelevantCodeForDimension(code: string, dimension: string): boolean {
  if (!code || code.trim().length === 0) return false;

  const patterns: Record<string, RegExp[]> = {
    'concurrency': [
      /\bThread\b/, /\bRunnable\b/, /\bCallable\b/, /\bExecutor\b/,
      /\bExecutorService\b/, /\bThreadPoolExecutor\b/, /\bForkJoinPool\b/,
      /\bCompletableFuture\b/, /\bFuture\b/, /\bSemaphore\b/,
      /\bCountDownLatch\b/, /\bCyclicBarrier\b/, /\bsynchronized\b/,
      /\bvolatile\b/, /\bLock\b/, /\bReentrantLock\b/, /\bBlockingQueue\b/,
      /\bConcurrentHashMap\b/, /\bAtomicInteger\b/, /\.submit\s*\(/,
      /\.execute\s*\(/, /\.get\s*\(/, /\.tryAcquire\s*\(/,
      /\basync\b/, /\bawait\b/, /\bPromise\b/, /\bWorker\b/
    ],
    'liveness': [
      /\bdeadlock\b/, /\bstarvation\b/, /\blivelock\b/,
      /\bfuture\.get\b/, /\bjoin\b/, /\bawait\b/, /\bLockSupport\.park\b/
    ],
    'security': [
      /\bpassword\b/, /\bsecret\b/, /\btoken\b/, /\bauth\b/,
      /\bencrypt\b/, /\bdecrypt\b/, /\bhash\b/, /\bsalt\b/,
      /\bsecurity\b/, /\bpermission\b/, /\bAuthentication\b/,
      /\bAuthorization\b/, /\bCORS\b/, /\bXSS\b/, /\bSQL\s+inject\b/,
      /\bunmodifiable\b/, /\bdefensive\s+copy\b/
    ],
    'error-handling': [
      /\btry\s*{/, /\bcatch\s*\(/, /\bfinally\b/, /\bthrow\b/,
      /\bthrows\b/, /\bException\b/, /\bError\b/, /\bRuntimeException\b/
    ],
    'resource-management': [
      /\bclose\b/, /\bshutdown\b/, /\brelease\b/, /\bdispose\b/,
      /\btry-with-resources\b/, /\bAutoCloseable\b/, /\bStream\b/,
      /\bconnection\b/, /\bsession\b/, /\bfactory\b/
    ],
    'api-design': [
      /\bpublic\s+interface\b/, /\bpublic\s+class\b/, /\bpublic\s+method\b/,
      /\b@Deprecated\b/, /\b@Override\b/, /\b@SuppressWarnings\b/
    ],
    'maintainability': [
      /\bTODO\b/, /\bFIXME\b/, /\b@Deprecated\b/, /\bduplicate\b/,
      /\brefact\b/, /\bcomplex\b/
    ],
    'performance': [
      /\bO\(/, /\bcomplexity\b/, /\bnested\s+loop\b/, /\brecursion\b/,
      /\bcache\b/, /\bpool\b/, /\bbuffer\b/
    ],
    'input-validation': [
      /\bvalidate\b/, /\bcheck\b/, /\bassert\b/, /\bif\s*\(.*\s*==\s*null\b/,
      /\bthrow\s+.*\s+IllegalArgumentException\b/, /\bObjects\.requireNonNull\b/
    ],
    'data-integrity': [
      /\bimmutable\b/, /\bfinal\b/, /\bCopyOnWrite\b/, /\bunmodifiable\b/,
      /\btransaction\b/, /\bconsistent\b/
    ],
    'architecture': [
      /\bfactory\b/, /\bbuilder\b/, /\bsingleton\b/, /\bproxy\b/,
      /\bobserver\b/, /\bstrategy\b/, /\bdecorator\b/
    ],
    'testability': [
      /\b@Test\b/, /\bmock\b/, /\bstub\b/, /\bspy\b/, /\bassert\b/,
      /\bMockito\b/, /\bJUnit\b/, /\bTest\b/
    ],
    'observability': [
      /\blog\b/, /\blogger\b/, /\bmetrics\b/, /\btrace\b/, /\bmonitor\b/,
      /\bconsole\.log\b/, /\bSystem\.out\b/, /\bprintln\b/
    ],
    'compatibility': [
      /\bversion\b/, /\bcompatible\b/, /\bdeprecated\b/, /\blegacy\b/
    ]
  };

  const dimensionPatterns = patterns[dimension] || [];
  if (dimensionPatterns.length === 0) return false;

  for (const pattern of dimensionPatterns) {
    if (pattern.test(code)) {
      return true;
    }
  }
  return false;
}

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

function normalizeTitle(source: unknown, summary?: string): string {
  const title = getSafeString(source);
  if (title.length > 0) return title;
  if (summary && summary.length > 0) {
    const clean = summary.replace(/[#*`]/g, '').trim();
    return clean.length > 80 ? `${clean.slice(0, 77)}...` : clean;
  }
  return DEFAULT_TITLE;
}

function normalizeCompletionStatus(source: unknown): CompletionStatus {
  const status = getSafeString(source);
  if (status === 'complete' || status === 'partially-complete') {
    return status as CompletionStatus;
  }
  return 'complete';
}

function normalizeRepairApplied(source: unknown): boolean {
  return Boolean(source);
}

function normalizeAppliedSpecializations(source: unknown): AppliedSpecialization[] {
  const arr = getSafeArray<unknown>(source, []);
  const result: AppliedSpecialization[] = [];
  for (const item of arr) {
    if (item === 'concurrency') {
      result.push(item);
    }
  }
  return result;
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

// ============================================================
// 🔥 اصلاح: تابع normalizeAnalysisCoverage با تشخیص کد مرتبط
// ============================================================

function normalizeAnalysisCoverage(
  source: unknown,
  findings?: any[],
  rawCode?: string
): AnalysisCoverageItem[] {
  const input = getSafeObject(source);
  const coverageMap: Record<string, { status: string; summary: string; limitation: string | null }> = {};

  // استخراج از source
  if (Array.isArray(source)) {
    for (const item of source) {
      if (isObject(item)) {
        const dim = getSafeString(item.dimension);
        if (ALL_DIMENSIONS.includes(dim as Dimension)) {
          coverageMap[dim] = {
            status: getSafeString(item.status, 'analyzed'),
            summary: getSafeString(item.summary, `Analysis of ${dim} dimension.`),
            limitation: getSafeString(item.limitation) || null,
          };
        }
      }
    }
  } else if (isObject(source)) {
    for (const key of ALL_DIMENSIONS) {
      const value = input[key];
      if (isObject(value)) {
        coverageMap[key] = {
          status: getSafeString((value as any).status, 'analyzed'),
          summary: getSafeString((value as any).summary, `Analysis of ${key} dimension.`),
          limitation: getSafeString((value as any).limitation) || null,
        };
      }
    }
  }

  // 🔥 تحلیل Findings برای تشخیص ابعاد واقعاً پوشش‌داده‌شده
  const analyzedDimensions = new Set<string>();
  if (findings && Array.isArray(findings)) {
    for (const finding of findings) {
      const category = finding?.category;
      if (category === 'concurrency' || category === 'liveness' || category === 'deadlock' || category === 'thread-starvation') {
        analyzedDimensions.add('concurrency');
        analyzedDimensions.add('liveness');
      }
      if (category === 'correctness' || category === 'data-integrity') {
        analyzedDimensions.add('correctness');
        analyzedDimensions.add('data-integrity');
      }
      if (category === 'resource-management' || category === 'resource-leak' || category === 'resource-lifecycle') {
        analyzedDimensions.add('resource-management');
      }
      if (category === 'error-handling' || category === 'timeout' || category === 'interruption') {
        analyzedDimensions.add('error-handling');
      }
      if (category === 'api-design' || category === 'configuration') {
        analyzedDimensions.add('api-design');
        analyzedDimensions.add('configuration');
      }
      if (category === 'performance') {
        analyzedDimensions.add('performance');
      }
      if (category === 'maintainability') {
        analyzedDimensions.add('maintainability');
      }
      if (category === 'architecture' || category === 'architectural-duplication') {
        analyzedDimensions.add('architecture');
      }
      if (category === 'testability') {
        analyzedDimensions.add('testability');
      }
      if (category === 'observability') {
        analyzedDimensions.add('observability');
      }
      if (category === 'compatibility') {
        analyzedDimensions.add('compatibility');
      }
      if (category === 'security') {
        analyzedDimensions.add('security');
      }
      if (category === 'input-validation') {
        analyzedDimensions.add('input-validation');
      }
    }
  }

  // 🔥 تشخیص کد مرتبط با هر بُعد (اگر کد وجود داشته باشد)
  const code = rawCode || '';
  const dimensionsWithRelevantCode = new Set<string>();
  if (code) {
    for (const dim of ALL_DIMENSIONS) {
      if (detectRelevantCodeForDimension(code, dim)) {
        dimensionsWithRelevantCode.add(dim);
      }
    }
  }

  const result: AnalysisCoverageItem[] = [];
  for (const dim of ALL_DIMENSIONS) {
    const existing = coverageMap[dim];
    const isAnalyzedByFindings = analyzedDimensions.has(dim);
    const hasRelevantCode = dimensionsWithRelevantCode.has(dim);

    let status: 'analyzed' | 'not-applicable' | 'limited' = 'limited';
    let limitation: string | null = null;

    // 🔥 منطق جدید:
    // 1. اگر در Findings پوشش داده شده → analyzed
    // 2. اگر کد مرتبط وجود دارد → analyzed (حتی اگر باگی پیدا نشده باشد)
    // 3. در غیر این صورت → limited یا not-applicable
    if (isAnalyzedByFindings) {
      status = 'analyzed';
    } else if (hasRelevantCode) {
      status = 'analyzed';
      limitation = null;
    } else {
      // اگر کد مرتبطی وجود ندارد، بررسی کنیم که آیا این بُعد قابل‌اعمال است یا خیر
      if (dim === 'concurrency' && !hasRelevantCode) {
        status = 'not-applicable';
        limitation = 'No concurrency primitives detected in the code.';
      } else if (dim === 'input-validation' && !hasRelevantCode) {
        status = 'limited';
        limitation = 'No explicit input validation analysis was performed.';
      } else if (dim === 'security' && !hasRelevantCode) {
        status = 'limited';
        limitation = 'No explicit security analysis was performed.';
      } else if (dim === 'liveness' && !hasRelevantCode) {
        status = 'not-applicable';
        limitation = 'No liveness issues detected in the code.';
      } else {
        status = 'limited';
        limitation = `Limited evidence available for ${dim} dimension.`;
      }
    }

    result.push({
      dimension: dim as any,
      status: status,
      summary: existing?.summary || `Analysis of ${dim} dimension.`,
      limitation: limitation,
    });
  }

  return result;
}

function normalizeScore(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && isFinite(value)) {
    if (value <= 10 && value >= 0) {
      return Math.max(0, Math.min(100, Math.round(value * 10)));
    }
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      if (parsed <= 10 && parsed >= 0) {
        return Math.max(0, Math.min(100, Math.round(parsed * 10)));
      }
      return Math.max(0, Math.min(100, Math.round(parsed)));
    }
  }
  return fallback;
}

function normalizeScoreItem(
  value: unknown,
  fallback: number = 0,
  defaultReason: string = ''
): ScoreItem {
  if (isObject(value)) {
    const score = normalizeScore(value.score, fallback);
    const reason = typeof value.reason === 'string' ? value.reason.trim() : defaultReason;
    let relatedFindingIds: string[] = [];
    if (Array.isArray(value.relatedFindingIds)) {
      relatedFindingIds = value.relatedFindingIds.filter((id): id is string => typeof id === 'string');
    } else if (Array.isArray(value.relatedFindings)) {
      relatedFindingIds = value.relatedFindings.filter((id): id is string => typeof id === 'string');
    }

    if (typeof score === 'number' && !isNaN(score) && score >= 0) {
      return {
        applicable: true,
        score,
        reason: reason || 'Score derived from data.',
        relatedFindingIds,
      };
    } else {
      return {
        applicable: false,
        score: null,
        reason: reason || 'No score available.',
        relatedFindingIds: [],
      };
    }
  }

  const score = normalizeScore(value, fallback);
  if (typeof score === 'number' && !isNaN(score) && score >= 0) {
    return {
      applicable: true,
      score,
      reason: defaultReason || 'Score derived from legacy data.',
      relatedFindingIds: [],
    };
  } else {
    return {
      applicable: false,
      score: null,
      reason: defaultReason || 'No score available.',
      relatedFindingIds: [],
    };
  }
}

function normalizeScorecard(source: unknown): AuditScorecard {
  const input = getSafeObject(source);
  return {
    correctness: normalizeScoreItem(input.correctness, 0, 'Correctness assessment.'),
    concurrencySafety: normalizeScoreItem(input.concurrencySafety ?? input.concurrency, 0, 'Concurrency safety assessment.'),
    liveness: normalizeScoreItem(input.liveness, 0, 'Liveness assessment.'),
    errorHandling: normalizeScoreItem(input.errorHandling, 0, 'Error handling assessment.'),
    resourceManagement: normalizeScoreItem(input.resourceManagement, 0, 'Resource management assessment.'),
    maintainability: normalizeScoreItem(input.maintainability, 0, 'Maintainability assessment.'),
    productionReadiness: normalizeScoreItem(input.productionReadiness, 0, 'Production readiness assessment.'),
  };
}

function normalizeComplexity(source: unknown): Complexity {
  const input = getSafeObject(source);

  if (isObject(input) && 'applicable' in input) {
    try {
      return ComplexitySchema.parse(input);
    } catch {
      // fall through
    }
  }

  const applicable = typeof input.applicable === 'boolean' ? input.applicable : true;

  if (!applicable) {
    return {
      applicable: false,
      expression: null,
      explanation: null,
      variables: [],
      assumptions: [],
    };
  }

  const expression = getSafeString(input.time ?? input.expression, 'unknown');
  const explanation = getSafeString(input.explanation, 'Complexity derived from source code.');
  const variables = Array.isArray(input.variables) ? input.variables : [];
  const assumptions = getStringArray(input.assumptions);

  const parsedVariables = variables.length > 0 ? variables : extractVariables(expression);

  return {
    applicable: true,
    expression,
    explanation,
    variables: parsedVariables,
    assumptions: assumptions.length > 0 ? assumptions : ['Complexity inferred from visible code structure.'],
  };
}

function extractVariables(expression: string): Array<{ symbol: string; definition: string }> {
  const matched = expression.match(/[OΩΘ]\(([^)]+)\)/g);
  if (!matched) return [];

  const variables: Array<{ symbol: string; definition: string }> = [];
  for (const part of matched) {
    const inner = part.replace(/[OΩΘ]\(/, '').replace(/\)$/, '');
    const symbols = inner.split(/[\s,]+/).filter((s) => s.length > 0 && !/^\d+$/.test(s));
    for (const sym of symbols) {
      if (!variables.find((v) => v.symbol === sym)) {
        variables.push({
          symbol: sym,
          definition: `${sym}: size of the relevant input or collection`,
        });
      }
    }
  }
  return variables;
}

function normalizeVerdict(source: unknown): { status: VerdictStatus; explanation: string } {
  const input = getSafeObject(source);

  if (isObject(input) && 'status' in input && 'explanation' in input) {
    try {
      return VerdictSchema.parse(input);
    } catch {
      // fall through
    }
  }

  const status = sanitizeEnum(
    input.status,
    VerdictStatusSchema.options,
    'requires-changes'
  );

  const explanation = getSafeString(
    input.explanation ?? input.summary,
    'Verdict based on code analysis.'
  );

  return { status, explanation };
}

function normalizeImprovedCode(source: unknown): ImprovedCode {
  const input = getSafeObject(source);

  if (isObject(input) && 'available' in input) {
    try {
      return ImprovedCodeSchema.parse(input);
    } catch {
      // fall through
    }
  }

  const code = getSafeString(input.code ?? input.improved_code);
  const notes = getSafeString(input.notes);

  if (code.length > 0) {
    return {
      available: true,
      code,
      notes: notes || 'Improved code provided.',
    };
  }

  return {
    available: false,
    code: null,
    notes: notes || 'No improved code available from context.',
  };
}

function normalizeFinding(finding: unknown, index: number, usedIds: Set<string>): AuditFinding {
  const f = getSafeObject(finding);

  const evidenceList = getSafeArray<unknown>(f.evidence, []);
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
  const testRaw = f.testToReproduce ?? f.test;
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

  let id = getSafeString(f.id, `F-${String(index + 1).padStart(3, '0')}`);
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

  const legacyCategory = getSafeString(f.category ?? f.type, 'other');
  const broadCategory = mapToBroadCategory(legacyCategory);
  
  const rawMechanisms = extractMechanisms(f);
  const validMechanisms: Mechanism[] = rawMechanisms
    .filter((m): m is Mechanism => {
      const result = MechanismSchema.safeParse(m);
      return result.success;
    });

  return {
    id: finalId,
    title: getSafeString(f.title, getSafeString(f.name, 'Untitled Finding')),
    category: broadCategory,
    mechanisms: validMechanisms,
    severity: sanitizeEnum(
      f.severity ?? f.priority,
      SeveritySchema.options,
      'medium'
    ),
    confidence: sanitizeEnum(
      f.confidence,
      ConfidenceSchema.options,
      'conditional'
    ),
    evidence: normalizedEvidence,
    executionPath: getStringArray(f.executionPath) || getStringArray(f.path) || [],
    triggerConditions: getStringArray(f.triggerConditions) || getStringArray(f.conditions) || [],
    consequence: getSafeString(f.consequence, getSafeString(f.impact, getSafeString(f.effect, 'No consequence provided.'))),
    technicalExplanation: getSafeString(f.technicalExplanation, getSafeString(f.details, 'No technical explanation provided.')),
    remediation: getSafeString(f.remediation, getSafeString(f.fix, getSafeString(f.solution, 'No remediation provided.'))),
    relatedSymbols: getStringArray(f.relatedSymbols) || getStringArray(f.symbols) || [],
    testToReproduce,
  };
}

function mapToBroadCategory(legacy: string): AuditFinding['category'] {
  const mapping: Record<string, any> = {
    'liveness': 'concurrency',
    'thread-starvation': 'concurrency',
    'deadlock': 'concurrency',
    'race-condition': 'concurrency',
    'duplicate-submission': 'concurrency',
    'queue-misuse': 'concurrency',
    'race condition': 'concurrency',
    'shared-state': 'concurrency',
    'shared state': 'concurrency',
    'configuration': 'configuration',
    'resource-lifecycle': 'resource-management',
    'resource lifecycle': 'resource-management',
    'resource leak': 'resource-management',
    'timeout': 'error-handling',
    'interruption': 'error-handling',
    'cancellation': 'error-handling',
    'retry': 'error-handling',
    'error-handling': 'error-handling',
    'api-semantics': 'api-design',
    'api-design': 'api-design',
    'performance': 'performance',
    'security': 'security',
    'maintainability': 'maintainability',
    'architectural-duplication': 'architecture',
  };
  return mapping[legacy] || 'other';
}

function extractMechanisms(finding: Record<string, unknown>): string[] {
  const mechanisms: string[] = [];
  const legacyCategory = getSafeString(finding.category ?? finding.type);

  const mechanismMapping: Record<string, string[]> = {
    'deadlock': ['deadlock'],
    'thread-starvation': ['thread-starvation'],
    'race-condition': ['race-condition'],
    'race condition': ['race-condition'],
    'duplicate-submission': ['duplicate-submission'],
    'queue-misuse': ['queue-misuse'],
    'blocking-wait': ['blocking-wait'],
    'shared-state': ['shared-state'],
    'shared state': ['shared-state'],
    'configuration': ['configuration-collision'],
    'resource-lifecycle': ['resource-leak'],
    'resource lifecycle': ['resource-leak'],
    'timeout': ['timeout-misuse'],
    'interruption': ['interruption-loss'],
    'cancellation': ['cancellation-failure'],
    'retry': ['retry-amplification'],
  };

  const fromCategory = mechanismMapping[legacyCategory] || [];
  mechanisms.push(...fromCategory);

  const explicit = getSafeArray(finding.mechanisms, []);
  for (const m of explicit) {
    if (typeof m === 'string' && !mechanisms.includes(m)) {
      mechanisms.push(m);
    }
  }

  return mechanisms;
}

function normalizeExecutionOverview(source: unknown): ExecutionOverview {
  const input = getSafeObject(source);
  if (!input || Object.keys(input).length === 0) {
    return {
      entryPoints: [],
      taskSubmissionPoints: [],
      blockingWaitPoints: [],
      sharedResources: [],
      resourceLifecycle: [],
    };
  }
  return {
    entryPoints: getStringArray(input.entryPoints),
    taskSubmissionPoints: getStringArray(input.taskSubmissionPoints),
    blockingWaitPoints: getStringArray(input.blockingWaitPoints),
    sharedResources: getStringArray(input.sharedResources),
    resourceLifecycle: getStringArray(input.resourceLifecycle),
  };
}

function normalizeArchitecturalObservations(
  source: unknown,
  findingIds: Set<string>
): ArchitecturalObservation[] {
  const arr = getSafeArray<unknown>(source, []);
  return arr
    .map((obs: unknown) => {
      const o = getSafeObject(obs);
      const title = getSafeString(o.title, '');
      const explanation = getSafeString(o.explanation, '');
      let relatedFindingIds: string[] = [];
      if (Array.isArray(o.relatedFindingIds)) {
        relatedFindingIds = o.relatedFindingIds.filter((id) => findingIds.has(id));
      } else if (Array.isArray(o.relatedFindings)) {
        relatedFindingIds = o.relatedFindings.filter((id) => findingIds.has(id));
      }
      return { title, explanation, relatedFindingIds };
    })
    .filter((obs) => obs.title.length > 0 || obs.explanation.length > 0);
}

function normalizeRecommendedActions(
  source: unknown,
  findingIds: Set<string>
): Array<{ priority: number; severity: any; title: string; action: string; relatedFindingIds: string[] }> {
  const arr = getSafeArray<unknown>(source, []);
  return arr
    .map((act: unknown) => {
      const a = getSafeObject(act);
      let priority = typeof a.priority === 'number' && a.priority > 0 ? Math.round(a.priority) : 1;
      const severity = sanitizeEnum(a.severity, SeveritySchema.options, 'medium');
      const title = getSafeString(a.title, '');
      const action = getSafeString(a.action, '');
      let relatedFindingIds: string[] = [];
      if (Array.isArray(a.relatedFindingIds)) {
        relatedFindingIds = a.relatedFindingIds.filter((id) => findingIds.has(id));
      } else if (Array.isArray(a.relatedFindings)) {
        relatedFindingIds = a.relatedFindings.filter((id) => findingIds.has(id));
      }
      return { priority, severity, title, action, relatedFindingIds };
    })
    .filter((act) => act.title.length > 0 || act.action.length > 0)
    .sort((a, b) => a.priority - b.priority)
    .map((act, index) => ({ ...act, priority: index + 1 }));
}

function normalizeSuggestedTests(
  source: unknown,
  findingIds: Set<string>
): SuggestedTest[] {
  const arr = getSafeArray<unknown>(source, []);
  return arr
    .map((test: unknown) => {
      const t = getSafeObject(test);
      const title = getSafeString(t.title, getSafeString(t.name, ''));
      const purpose = getSafeString(t.purpose, '');
      const setup = getStringArray(t.setup) || [];
      const steps = getStringArray(t.steps) || [];
      const expectedResult = getSafeString(t.expectedResult, getSafeString(t.expectedOutput, ''));
      let relatedFindingIds: string[] = [];
      if (Array.isArray(t.relatedFindingIds)) {
        relatedFindingIds = t.relatedFindingIds.filter((id) => findingIds.has(id));
      } else if (Array.isArray(t.relatedFindings)) {
        relatedFindingIds = t.relatedFindings.filter((id) => findingIds.has(id));
      }
      return { title, purpose, setup, steps, expectedResult, relatedFindingIds };
    })
    .filter((test) => test.title.length > 0 || test.purpose.length > 0);
}

function normalizeLanguage(source: unknown): string {
  return getSafeString(source, 'unknown');
}

function createMinimalAuditFromPartial(
  raw: unknown,
  error: unknown
): AdvancedAuditResult | null {
  try {
    const input = getSafeObject(raw);
    const summary = getSafeString(input.summary, getSafeString(input.highLevelSummary, 'Partial analysis.'));
    const title = normalizeTitle(input.title, summary);
    const language = normalizeLanguage(input.language);

    // 🔥 استخراج rawCode از input
    const rawCode = typeof (input as any).rawCode === 'string' ? (input as any).rawCode : '';

    let analysisCoverage = normalizeAnalysisCoverage(
      input.analysisCoverage ?? input.coverage ?? {},
      getSafeArray(input.findings, []),
      rawCode
    );
    if (analysisCoverage.length === 0) {
      analysisCoverage = ALL_DIMENSIONS.map(dim => ({
        dimension: dim as any,
        status: 'analyzed',
        summary: `Analysis of ${dim} dimension.`,
        limitation: null,
      }));
    }

    let executionOverview = normalizeExecutionOverview(input.executionOverview ?? input.overview ?? {});
    if (!executionOverview || Object.keys(executionOverview).length === 0) {
      executionOverview = {
        entryPoints: [],
        taskSubmissionPoints: [],
        blockingWaitPoints: [],
        sharedResources: [],
        resourceLifecycle: [],
      };
    }

    const minimal: AdvancedAuditResult = {
      schemaVersion: '1.0.0',
      auditType: 'comprehensive',
      appliedSpecializations: normalizeAppliedSpecializations(input.appliedSpecializations ?? input.specializations),
      completionStatus: 'partially-complete',
      repairApplied: true,
      title,
      language: language || 'unknown',
      analysisCoverage,
      summary: summary || 'Partial analysis due to schema mismatch.',
      executionOverview,
      findings: getSafeArray<unknown>(input.findings ?? input.issues ?? [], []).map((f, i) => {
        const usedIds = new Set<string>();
        return normalizeFinding(f, i, usedIds);
      }),
      architecturalObservations: normalizeArchitecturalObservations(
        input.architecturalObservations ?? input.architectural_observations,
        new Set()
      ),
      recommendedActions: normalizeRecommendedActions(
        input.recommendedActions ?? input.recommended_actions,
        new Set()
      ),
      suggestedTests: normalizeSuggestedTests(
        input.suggestedTests ?? input.suggested_tests ?? input.suggestedTestsNew,
        new Set()
      ),
      complexity: normalizeComplexity(input.complexity ?? {}),
      scorecard: normalizeScorecard(input.scorecard ?? input.scorecard_new ?? {}),
      verdict: normalizeVerdict(input.verdict ?? input.finalVerdict ?? {}),
      limitations: getStringArray(input.limitations).length > 0 ? getStringArray(input.limitations) : ['Analysis is incomplete due to data validation issues.'],
      improvedCode: normalizeImprovedCode(input.improvedCode ?? input.improved_code ?? {}),
      linkedinPost: getSafeString(input.linkedinPost ?? input.linkedin_post) || DEFAULT_LINKEDIN_POST,
    };

    return minimal;
  } catch (err) {
    logger.error('[Normalizer] Failed to create minimal audit:', err);
    return null;
  }
}

export function normalizeAnalysisOutput(raw: unknown): AdvancedAuditResult {
  const startTime = Date.now();
  logger.debug('[Normalizer] Starting normalization');

  const input = getSafeObject(raw);

  const summary = getSafeString(input.summary, getSafeString(input.highLevelSummary, 'No summary provided.'));
  const title = normalizeTitle(input.title, summary);
  const completionStatus = normalizeCompletionStatus(input.status ?? input.completionStatus);
  const repairApplied = normalizeRepairApplied(input.repairApplied ?? false);
  const appliedSpecializations = normalizeAppliedSpecializations(
    input.appliedSpecializations ?? input.specializations ?? []
  );

  const language = normalizeLanguage(input.language);

  const findingsSource =
    input.findings ??
    input.issues ??
    input.advancedFindings ??
    input.concurrencyFindings ??
    (isObject(input.analysis) ? input.analysis.findings : undefined);

  const findingsArray = getSafeArray<unknown>(findingsSource, []);
  const usedIds = new Set<string>();

  const normalizedFindings: AuditFinding[] = findingsArray
    .map((f: unknown, index: number) => normalizeFinding(f, index, usedIds))
    .filter((finding) => finding.title.trim().length > 0 || finding.evidence.length > 0);

  const findingIds = new Set(normalizedFindings.map((f) => f.id));

  const scorecardSource = getSafeObject(
    input.scorecard ??
    input.scorecard_new ??
    input.scorecardLegacy ??
    {}
  );
  const scorecard = normalizeScorecard(scorecardSource);

  const verdictSource = getSafeObject(input.verdict ?? input.finalVerdict ?? {});
  const verdict = normalizeVerdict(verdictSource);

  const complexitySource = getSafeObject(input.complexity ?? {});
  const complexity = normalizeComplexity(complexitySource);

  const improvedCodeSource = getSafeObject(
    input.improvedCode ??
    input.improved_code ??
    {}
  );
  const improvedCode = normalizeImprovedCode(improvedCodeSource);

  let executionOverview = normalizeExecutionOverview(
    input.executionOverview ??
    input.execution_overview ??
    input.overview ??
    {}
  );
  if (!executionOverview || Object.keys(executionOverview).length === 0) {
    executionOverview = {
      entryPoints: [],
      taskSubmissionPoints: [],
      blockingWaitPoints: [],
      sharedResources: [],
      resourceLifecycle: [],
    };
  }

  const architecturalObservations = normalizeArchitecturalObservations(
    input.architecturalObservations ?? input.architectural_observations,
    findingIds
  );

  const recommendedActions = normalizeRecommendedActions(
    input.recommendedActions ?? input.recommended_actions,
    findingIds
  );

  const suggestedTests = normalizeSuggestedTests(
    input.suggestedTests ??
    input.suggested_tests ??
    input.suggestedTestsNew ??
    input.suggested_tests_new,
    findingIds
  );

  const limitations = getStringArray(input.limitations);

  let linkedinPost =
    typeof input.linkedinPost === 'string'
      ? input.linkedinPost.trim()
      : typeof input.linkedin_post === 'string'
        ? input.linkedin_post.trim()
        : '';

  if (!linkedinPost) {
    linkedinPost = DEFAULT_LINKEDIN_POST;
  }

  // 🔥 اصلاح: استخراج rawCode و ارسال به normalizeAnalysisCoverage
  const rawCode = typeof (input as any).rawCode === 'string' ? (input as any).rawCode : '';

  let analysisCoverage = normalizeAnalysisCoverage(
    input.analysisCoverage ?? input.coverage ?? {},
    normalizedFindings,
    rawCode
  );
  if (analysisCoverage.length === 0) {
    analysisCoverage = ALL_DIMENSIONS.map(dim => ({
      dimension: dim as any,
      status: 'analyzed',
      summary: `Analysis of ${dim} dimension.`,
      limitation: null,
    }));
  }

  const result: AdvancedAuditResult = {
    schemaVersion: '1.0.0',
    auditType: 'comprehensive',
    appliedSpecializations,
    completionStatus,
    repairApplied,
    title,
    language,
    analysisCoverage,
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
    linkedinPost,
  };

  try {
    const validated = AdvancedAuditResultSchema.parse(result);
    const duration = Date.now() - startTime;
    logger.debug('[Normalizer] Completed in', duration, 'ms, findings:', normalizedFindings.length);
    return validated;
  } catch (error) {
    logger.error('[Normalizer] Schema validation failed, attempting to create minimal audit...', error);
    const minimal = createMinimalAuditFromPartial(result, error);
    if (minimal) {
      logger.info('[Normalizer] Returning minimal audit with partial data');
      return minimal;
    }
    logger.error('[Normalizer] Returning partial data as fallback');
    return result;
  }
}