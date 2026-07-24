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

// ===== New taxonomy =====
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

// ===== Specializations =====
export const SpecializationSchema = z.enum(['concurrency']);

// ===== Coverage status =====
export const CoverageStatusSchema = z.enum(['analyzed', 'not-applicable', 'limited']);

// ===== Completion status (separate from repair) =====
export const CompletionStatusSchema = z.enum(['complete', 'partially-complete']);

// ============================================================
// 3. Nested schemas (strict)
// ============================================================

// ---- Evidence ----
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

// ---- Finding (new taxonomy) ----
export const AuditFindingSchema = z
  .object({
    id: FindingIdSchema,
    title: NonEmptyTextSchema,
    category: BroadCategorySchema,
    mechanisms: z.array(MechanismSchema).min(0),
    severity: SeveritySchema,
    confidence: ConfidenceSchema,
    evidence: z.array(EvidenceItemSchema).min(1),
    executionPath: z.array(NonEmptyTextSchema).min(1),
    triggerConditions: z.array(NonEmptyTextSchema).min(1),
    consequence: NonEmptyTextSchema,
    technicalExplanation: NonEmptyTextSchema,
    remediation: NonEmptyTextSchema,
    relatedSymbols: z.array(z.string()),
    testToReproduce: z
      .object({
        title: NonEmptyTextSchema,
        setup: z.array(z.string()),
        steps: z.array(NonEmptyTextSchema).min(1),
        expectedResult: NonEmptyTextSchema,
      })
      .nullable(),
  })
  .strict();

// ---- Scorecard item (discriminated union for applicability) ----
export const ApplicableScoreItemSchema = z
  .object({
    applicable: z.literal(true),
    score: z.number().int().min(0).max(100),
    reason: NonEmptyTextSchema,
    relatedFindings: z.array(FindingIdSchema),
  })
  .strict();

export const NotApplicableScoreItemSchema = z
  .object({
    applicable: z.literal(false),
    score: z.null(),
    reason: NonEmptyTextSchema,
    relatedFindings: z.array(z.never()), // must be empty
  })
  .strict();

export const ScoreItemSchema = z.discriminatedUnion('applicable', [
  ApplicableScoreItemSchema,
  NotApplicableScoreItemSchema,
]);

// ---- Scorecard ----
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

// ---- ImprovedCode (discriminated union) ----
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

// ---- Recommended action ----
export const RecommendedActionSchema = z
  .object({
    priority: z.number().int().positive(),
    severity: SeveritySchema,
    title: NonEmptyTextSchema,
    action: NonEmptyTextSchema,
    relatedFindingIds: z.array(FindingIdSchema),
  })
  .strict();

// ---- Analysis coverage ----
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

// ---- Execution overview ----
export const ExecutionOverviewSchema = z
  .object({
    entryPoints: z.array(z.string()),
    taskSubmissionPoints: z.array(z.string()),
    blockingWaitPoints: z.array(z.string()),
    sharedResources: z.array(z.string()),
    resourceLifecycle: z.array(z.string()),
  })
  .strict();

// ---- Architectural observation ----
export const ArchitecturalObservationSchema = z
  .object({
    title: NonEmptyTextSchema,
    explanation: NonEmptyTextSchema,
    relatedFindingIds: z.array(FindingIdSchema),
  })
  .strict();

// ---- Suggested test ----
export const SuggestedTestSchema = z
  .object({
    title: NonEmptyTextSchema,
    purpose: NonEmptyTextSchema,
    setup: z.array(z.string()),
    steps: z.array(NonEmptyTextSchema).min(1),
    expectedResult: NonEmptyTextSchema,
    relatedFindingIds: z.array(FindingIdSchema),
  })
  .strict();

// ---- Complexity variable ----
export const ComplexityVariableSchema = z
  .object({
    symbol: NonEmptyTextSchema,
    definition: NonEmptyTextSchema,
  })
  .strict();

// ---- Complexity (discriminated union) ----
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

// ---- Verdict ----
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
// 4. Top-level Canonical Schema (strict, no optional, no defaults)
// ============================================================

export const AdvancedAuditResultSchema = z
  .object({
    // ---- Metadata ----
    schemaVersion: z.literal('1.0'),
    auditType: z.literal('comprehensive'),
    appliedSpecializations: z.array(SpecializationSchema),

    completionStatus: CompletionStatusSchema,
    repairApplied: z.boolean(),

    // ---- Title and language ----
    title: NonEmptyTextSchema, // audit report title (not DB title)
    language: z.string().min(1), // programming language of source
    responseLanguage: z.enum(['English', 'Persian']).nullable(), // natural language for explanations

    // ---- Coverage ----
    analysisCoverage: z.array(AnalysisCoverageItemSchema), // required, must include all dimensions

    // ---- Summary ----
    summary: NonEmptyTextSchema,

    // ---- Execution overview ----
    executionOverview: ExecutionOverviewSchema,

    // ---- Findings (no defaults) ----
    findings: z.array(AuditFindingSchema), // required, empty if none

    // ---- Architectural observations ----
    architecturalObservations: z.array(ArchitecturalObservationSchema), // required

    // ---- Recommended actions ----
    recommendedActions: z.array(RecommendedActionSchema), // required

    // ---- Suggested tests ----
    suggestedTests: z.array(SuggestedTestSchema), // required

    // ---- Complexity ----
    complexity: ComplexitySchema,

    // ---- Scorecard ----
    scorecard: AuditScorecardSchema,

    // ---- Verdict ----
    verdict: VerdictSchema,

    // ---- Limitations ----
    limitations: z.array(NonEmptyTextSchema), // required

    // ---- Improved code ----
    improvedCode: ImprovedCodeSchema,

    // ---- LinkedIn post ----
    linkedin_post: z.string().trim().min(1, 'LinkedIn post must not be empty').max(300, 'LinkedIn post must be at most 300 characters'),
  })
  .strict();

// ============================================================
// 5. Type inference
// ============================================================

export type AdvancedAuditResult = z.infer<typeof AdvancedAuditResultSchema>;

// Re‑export key types for convenience
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