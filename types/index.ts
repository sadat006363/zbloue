// types/index.ts

import { z } from 'zod';
import {
  AdvancedAuditResultSchema,
  AuditFindingSchema,
  AuditScorecardSchema,
  AuditTypeSchema,
  AuditStatusSchema,
  VerdictStatusSchema,
  SeveritySchema,
  ConfidenceSchema,
  FindingCategorySchema,
  EvidenceItemSchema,
  ScoreItemSchema,
  ImprovedCodeSchema,
  RecommendedActionSchema,
  type AdvancedAuditResult,
  type AuditFinding,
  type AuditScorecard,
  type AuditType,
  type AuditStatus,
  type VerdictStatus,
  type Severity,
  type Confidence,
  type FindingCategory,
  type EvidenceItem,
  type ScoreItem,
  type ImprovedCode,
  type RecommendedAction,
} from '@/lib/analysis/schema';

// ============================================================
// 🔥 تایپ‌های اصلی (از Schema اصلی استخراج شده‌اند)
// ============================================================

export type {
  AdvancedAuditResult,
  AuditFinding,
  AuditScorecard,
  AuditType,
  AuditStatus,
  VerdictStatus,
  Severity,
  Confidence,
  FindingCategory,
  EvidenceItem,
  ScoreItem,
  ImprovedCode,
  RecommendedAction,
};

// ============================================================
// 🔥 تایپ‌های Legacy (برای سازگاری با عقب و UI)
// ============================================================

export interface LegacyScorecard {
  correctness: number;
  readability: number;
  performance: number;
  maintainability: number;
  productionReadiness: number;
  security?: number;
  overall?: number;
}

export interface LegacySuggestedTest {
  name: string;
  input: string;
  expectedOutput: string;
  type: 'Normal' | 'Edge' | 'Invalid';
}

export interface LegacyBugAndRiskyCase {
  issue: string;
  impact: string;
  example?: string;
}

export interface LegacyEdgeCase {
  case: string;
  currentBehavior: string;
  expectedBehavior: string;
  risk: 'Low' | 'Medium' | 'High';
}

export interface LegacyCodeWalkthroughItem {
  section: string;
  explanation: string;
}

export interface LegacyPerformanceAnalysis {
  timeComplexity: Array<{ target: string; complexity: string; explanation: string }>;
  spaceComplexity: Array<{ target: string; complexity: string; explanation: string }>;
  scalabilityNotes: string[];
}

export interface LegacySecurityAnalysis {
  issues: string[];
  recommendations: string[];
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface LegacyProductionReadiness {
  isProductionReady: boolean;
  reasons: string[];
  requiredChanges: string[];
}

export interface LegacyRecommendedImprovement {
  priority: 'High' | 'Medium' | 'Low';
  improvement: string;
  reason: string;
}

// ============================================================
// 🔥 Exportهای Legacy با نام‌های اصلی (برای سازگاری با UI)
// ============================================================

export type CodeWalkthroughItem = LegacyCodeWalkthroughItem;
export type BugAndRiskyCase = LegacyBugAndRiskyCase;
export type EdgeCase = LegacyEdgeCase;
export type PerformanceAnalysis = LegacyPerformanceAnalysis;
export type SecurityAnalysis = LegacySecurityAnalysis;
export type ProductionReadiness = LegacyProductionReadiness;
export type RecommendedImprovement = LegacyRecommendedImprovement;
export type SuggestedTest = LegacySuggestedTest;
export type ScorecardLegacy = LegacyScorecard;

// ============================================================
// 🔥 Snippet Schema (برای اعتبارسنجی داده‌های دیتابیس)
// ============================================================

export const SnippetDataSchema = z.object({
  id: z.string(),
  slug: z.string(),
  raw_code: z.string(),
  language: z.string(),
  card_title: z.string(),
  key_concept: z.string(),
  what_this_code_does: z.string(),
  debug_analysis: z.string(),
  optimization: z.string(),
  linkedin_post: z.string(),
  is_public: z.boolean(),
  created_at: z.string(),

  username: z.string().optional(),
  github_username: z.string().optional(),
  avatar_url: z.string().optional(),
  card_image_url: z.string().optional(),

  code_walkthrough: z.any().optional(),
  what_works_well: z.any().optional(),
  bugs_and_risky_cases: z.any().optional(),
  edge_cases: z.any().optional(),
  performance_analysis: z.any().optional(),
  security_analysis: z.any().optional(),
  production_readiness: z.any().optional(),
  recommended_improvements: z.any().optional(),
  improved_code: z.string().optional(),
  suggested_tests: z.any().optional(),
  scorecard: z.any().optional(),
  final_verdict_summary: z.string().optional(),
  final_verdict_approved: z.boolean().optional(),
  final_verdict_next_steps: z.string().optional(),
  line_explanations: z.any().optional(),
  generated_prompt: z.string().optional(),

  findings: z.any().optional(),
  execution_overview: z.any().optional(),
  architectural_observations: z.any().optional(),
  recommended_actions: z.any().optional(),
  suggested_tests_new: z.any().optional(),
  complexity: z.any().optional(),
  scorecard_new: z.any().optional(),
  verdict: z.any().optional(),
  limitations: z.array(z.string()).optional(),

  audit_result: z.any().optional(),
  debug_trace: z.any().optional(),
});

export type Snippet = z.infer<typeof SnippetDataSchema>;

// ============================================================
// 🔥 تایپ‌های درخواست و پاسخ API
// ============================================================

export interface GenerateRequest {
  code: string;
  language: string;
  mode: 'simple' | 'medium' | 'advanced';
}

export interface CreateSnippetResponse {
  success: boolean;
  id: string;
  slug: string;
  url: string;
  username?: string | null;
  github_username?: string | null;
  error?: string;
}

export interface GenerateResponse extends Partial<AdvancedAuditResult> {
  title?: string;
  highLevelSummary?: string;
  analysis?: string;
  card_title?: string;
  key_concept?: string;
  what_this_code_does?: string;
  debug_analysis?: string;
  optimization?: string;
  codeWalkthrough?: LegacyCodeWalkthroughItem[];
  whatWorksWell?: string[];
  bugsAndRiskyCases?: LegacyBugAndRiskyCase[];
  edgeCases?: LegacyEdgeCase[];
  performanceAnalysis?: LegacyPerformanceAnalysis;
  securityAnalysis?: LegacySecurityAnalysis;
  productionReadiness?: LegacyProductionReadiness;
  recommendedImprovements?: LegacyRecommendedImprovement[];
  improvedCode?: LegacyImprovedCode | ImprovedCode;
  suggestedTestsLegacy?: LegacySuggestedTest[];
  scorecardLegacy?: LegacyScorecard;
  finalVerdict?: {
    summary: string;
    approved: boolean;
    nextSteps?: string;
  };
  error?: string;
}

export interface LegacyImprovedCode {
  available: boolean;
  code: string;
  notes: string;
}

// ============================================================
// 🔥 سایر تایپ‌ها
// ============================================================

export interface LineExplanation {
  lineNumber: number;
  code?: string;
  explanation: string;
}

export interface PromptInfo {
  auditType: 'simple' | 'medium' | 'advanced' | 'concurrency' | 'generic' | null;
  status: 'complete' | 'repaired' | 'partially_complete' | 'failed_validation' | 'fallback' | null;
  isPipeline: boolean;
}

export interface ModeOutput {
  snippet: Snippet | null;
  fullAnalysis: GenerateResponse | null;
  lineExplanations: LineExplanation[];
  generatedPrompt: string;
}

export type OutputsByMode = {
  [K in 'simple' | 'medium' | 'advanced']: ModeOutput;
};

export interface AppState {
  code: string;
  language: string;
  mode: 'simple' | 'medium' | 'advanced';
  loading: boolean;
  isConverting: boolean;
  isExplaining: boolean;
  isGeneratingPrompt: boolean;
  errorMessage: string | null;
  convertError: string | null;
  explainError: string | null;
  promptError: string | null;
  outputs: OutputsByMode;
  username: string;
  githubUsername: string;
  avatarUrl: string | null;
  convertLanguage: string;
  hoveredLine: number | null;
  toastMessage: string | null;
  promptInfo: PromptInfo | null;
}