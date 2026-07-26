// lib/analysis/schema.ts

import { z } from 'zod';

// ============================================================
// 1. Shared reusable text schemas
// ============================================================

export const NonEmptyTextSchema = z.string().trim().min(1, 'Must not be empty or whitespace-only');

// ============================================================
// 2. Enums and constants
// ============================================================

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);

export const ConfidenceSchema = z.enum(['definite', 'likely', 'conditional']);

export const FindingIdSchema = z.string().regex(/^F-\d{3,}$/, 'Finding ID must match F-XXX');

export const BroadCategorySchema = z.enum([
  'correctness',
  'concurrency',
  'security',
  'reliability',
  'error-handling',
  'resource-management',
  'performance',
  'data-integrity',
  'input-validation',
  'api-design',
  'configuration',
  'architecture',
  'maintainability',
  'testability',
  'observability',
  'compatibility',
  'other',
]);

export const MechanismSchema = z.enum([
  'deadlock',
  'thread-starvation',
  'race-condition',
  'duplicate-submission',
  'queue-misuse',
  'blocking-wait',
  'shared-state',
  'configuration-collision',
  'resource-leak',
  'timeout-misuse',
  'interruption-loss',
  'cancellation-failure',
  'retry-amplification',
]);

export const SpecializationSchema = z.enum(['concurrency']);

export const CoverageStatusSchema = z.enum(['analyzed', 'not-applicable', 'limited']);

export const CompletionStatusSchema = z.enum(['complete', 'partially-complete']);

// ============================================================
// 3. Nested schemas
// ============================================================

export const EvidenceItemSchema = z
  .object({
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
    code: NonEmptyTextSchema,
    explanation: NonEmptyTextSchema,
  })
  .refine((data) => data.endLine >= data.startLine, {
    message: 'endLine must be >= startLine',
  })
  .strict();

export const AuditFindingSchema = z
  .object({
    id: FindingIdSchema,
    title: NonEmptyTextSchema,
    category: BroadCategorySchema,
    mechanisms: z.array(MechanismSchema).default([]),
    severity: SeveritySchema,
    confidence: ConfidenceSchema,
    evidence: z.array(EvidenceItemSchema).default([]),
    executionPath: z.array(NonEmptyTextSchema).default([]),
    triggerConditions: z.array(z.string()).default([]),
    consequence: z.string().default('No consequence provided.'),
    technicalExplanation: z.string().default('No technical explanation provided.'),
    remediation: z.string().default('No remediation provided.'),
    relatedSymbols: z.array(z.string()).default([]),
    testToReproduce: z
      .object({
        title: NonEmptyTextSchema,
        setup: z.array(z.string()),
        steps: z.array(NonEmptyTextSchema).min(1),
        expectedResult: NonEmptyTextSchema,
      })
      .nullable()
      .default(null),
  })
  .strict();

export const ApplicableScoreItemSchema = z
  .object({
    applicable: z.literal(true),
    score: z.number().int().min(0).max(100),
    reason: NonEmptyTextSchema,
    relatedFindingIds: z.array(z.string()).default([]),
  })
  .strict();

export const NotApplicableScoreItemSchema = z
  .object({
    applicable: z.literal(false),
    score: z.null(),
    reason: NonEmptyTextSchema,
    relatedFindingIds: z.array(z.never()),
  })
  .strict();

export const ScoreItemSchema = z.discriminatedUnion('applicable', [
  ApplicableScoreItemSchema,
  NotApplicableScoreItemSchema,
]);

export const AuditScorecardSchema = z
  .object({
    correctness: ScoreItemSchema,
    concurrencySafety: ScoreItemSchema,
    liveness: ScoreItemSchema,
    errorHandling: ScoreItemSchema,
    resourceManagement: ScoreItemSchema,
    maintainability: ScoreItemSchema,
    productionReadiness: ScoreItemSchema,
  })
  .strict();

export const AvailableImprovedCodeSchema = z
  .object({
    available: z.literal(true),
    code: NonEmptyTextSchema,
    notes: NonEmptyTextSchema.nullable(),
  })
  .strict();

export const UnavailableImprovedCodeSchema = z
  .object({
    available: z.literal(false),
    code: z.null(),
    notes: NonEmptyTextSchema.nullable(),
  })
  .strict();

export const ImprovedCodeSchema = z.discriminatedUnion('available', [
  AvailableImprovedCodeSchema,
  UnavailableImprovedCodeSchema,
]);

export const RecommendedActionSchema = z
  .object({
    priority: z.number().int().positive(),
    severity: SeveritySchema,
    title: NonEmptyTextSchema,
    action: NonEmptyTextSchema,
    relatedFindingIds: z.array(z.string()).default([]),
  })
  .strict();

export const AnalysisCoverageItemSchema = z
  .object({
    dimension: z.enum([
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
    ]),
    status: CoverageStatusSchema,
    summary: NonEmptyTextSchema,
    limitation: NonEmptyTextSchema.nullable(),
  })
  .strict();

export const ExecutionOverviewSchema = z
  .object({
    entryPoints: z.array(z.string()).default([]),
    taskSubmissionPoints: z.array(z.string()).default([]),
    blockingWaitPoints: z.array(z.string()).default([]),
    sharedResources: z.array(z.string()).default([]),
    resourceLifecycle: z.array(z.string()).default([]),
  })
  .strict();

export const ArchitecturalObservationSchema = z
  .object({
    title: NonEmptyTextSchema,
    explanation: NonEmptyTextSchema,
    relatedFindingIds: z.array(z.string()).default([]),
  })
  .strict();

export const SuggestedTestSchema = z
  .object({
    title: NonEmptyTextSchema,
    purpose: NonEmptyTextSchema,
    setup: z.array(z.string()),
    steps: z.array(NonEmptyTextSchema).min(1),
    expectedResult: NonEmptyTextSchema,
    relatedFindingIds: z.array(z.string()).default([]),
  })
  .strict();

export const ComplexityVariableSchema = z
  .object({
    symbol: NonEmptyTextSchema,
    definition: NonEmptyTextSchema,
  })
  .strict();

export const ApplicableComplexitySchema = z
  .object({
    applicable: z.literal(true),
    expression: NonEmptyTextSchema,
    explanation: NonEmptyTextSchema,
    variables: z.array(ComplexityVariableSchema),
    assumptions: z.array(NonEmptyTextSchema),
  })
  .strict();

export const InapplicableComplexitySchema = z
  .object({
    applicable: z.literal(false),
    expression: z.null(),
    explanation: NonEmptyTextSchema.nullable(),
    variables: z.array(z.never()),
    assumptions: z.array(NonEmptyTextSchema),
  })
  .strict();

export const ComplexitySchema = z.discriminatedUnion('applicable', [
  ApplicableComplexitySchema,
  InapplicableComplexitySchema,
]);

export const VerdictStatusSchema = z.enum([
  'not-production-ready',
  'requires-major-changes',
  'requires-changes',
  'requires-minor-changes',
  'approved-with-suggestions',
  'approved',
]);

export const VerdictSchema = z
  .object({
    status: VerdictStatusSchema,
    explanation: NonEmptyTextSchema,
  })
  .strict();

// ============================================================
// 4. Top-level Canonical Schema (نسخه اصلاح‌شده)
// ============================================================

export const AdvancedAuditResultSchema = z
  .object({
    // 🔥 اصلاح: قبول هر دو نسخه "1.0.0" و "1.0"
    schemaVersion: z.union([
      z.literal('1.0.0'),
      z.literal('1.0'),
    ]).default('1.0.0'),

    auditType: z.literal('comprehensive'),
    appliedSpecializations: z.array(SpecializationSchema).default([]),
    completionStatus: CompletionStatusSchema,
    repairApplied: z.boolean(),
    title: NonEmptyTextSchema,
    language: z.string().min(1),
    summary: NonEmptyTextSchema,
    analysisCoverage: z.array(AnalysisCoverageItemSchema),
    executionOverview: ExecutionOverviewSchema,
    findings: z.array(AuditFindingSchema).default([]),
    architecturalObservations: z.array(ArchitecturalObservationSchema).default([]),
    recommendedActions: z.array(RecommendedActionSchema).default([]),
    suggestedTests: z.array(SuggestedTestSchema).default([]),
    complexity: ComplexitySchema,
    scorecard: AuditScorecardSchema,
    verdict: VerdictSchema,
    limitations: z.array(NonEmptyTextSchema).default([]),
    improvedCode: ImprovedCodeSchema,
    linkedinPost: z.string().trim().min(1, 'LinkedIn post must not be empty').max(300, 'LinkedIn post must be at most 300 characters'),
  })
  .strict()
  // 🔥 حذف فیلدهای ناشناخته (responseLanguage, linkedin_post, relatedFindings)
  .catchall(z.unknown()); // ← این اجازه می‌دهد فیلدهای اضافی نادیده گرفته شوند

// ============================================================
// 5. Type inference
// ============================================================

export type AdvancedAuditResult = z.infer<typeof AdvancedAuditResultSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type FindingCategory = z.infer<typeof BroadCategorySchema>;
export type AuditFinding = z.infer<typeof AuditFindingSchema>;
export type AuditScorecard = z.infer<typeof AuditScorecardSchema>;
export type ImprovedCode = z.infer<typeof ImprovedCodeSchema>;
export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type ScoreItem = z.infer<typeof ScoreItemSchema>;
export type VerdictStatus = z.infer<typeof VerdictStatusSchema>;
export type Complexity = z.infer<typeof ComplexitySchema>;
export type AnalysisCoverageItem = z.infer<typeof AnalysisCoverageItemSchema>;
export type ArchitecturalObservation = z.infer<typeof ArchitecturalObservationSchema>;
export type SuggestedTest = z.infer<typeof SuggestedTestSchema>;
export type ExecutionOverview = z.infer<typeof ExecutionOverviewSchema>;