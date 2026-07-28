// types/index.ts

import { z } from 'zod';
import {
  AdvancedAuditResultSchema,
  AuditFindingSchema,
  AuditScorecardSchema,
  VerdictSchema as CanonicalVerdictSchema,
  RecommendedActionSchema,
  ComplexitySchema,
  ArchitecturalObservationSchema,
  SuggestedTestSchema,
  ExecutionOverviewSchema,
} from '@/lib/analysis/schema';

import type {
  AdvancedAuditResult,
  AuditFinding,
  AuditScorecard,
  VerdictStatus,
  Severity,
  Confidence,
  FindingCategory,
  EvidenceItem,
  ScoreItem,
  ImprovedCode,
  RecommendedAction,
  Complexity,
  AnalysisCoverageItem,
  ArchitecturalObservation,
  SuggestedTest,
  ExecutionOverview,
} from '@/lib/analysis/types';

// ============================================================
// Re-export canonical types
// ============================================================

export type {
  AdvancedAuditResult,
  AuditFinding,
  AuditScorecard,
  VerdictStatus,
  Severity,
  Confidence,
  FindingCategory,
  EvidenceItem,
  ScoreItem,
  ImprovedCode,
  RecommendedAction,
  Complexity,
  AnalysisCoverageItem,
  ArchitecturalObservation,
  SuggestedTest,
  ExecutionOverview,
};

// ============================================================
// AnalysisMode – UI contract
// ============================================================

export type AnalysisMode = 'simple' | 'medium' | 'advanced';
export const AnalysisModeSchema = z.enum(['simple', 'medium', 'advanced']);

// ============================================================
// GenerateRequest
// ============================================================

export const GenerateRequestSchema = z.object({
  code: z.string().min(1),
  language: z.string().min(1),
  mode: AnalysisModeSchema,
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

// ============================================================
// PromptInfo
// ============================================================

export interface PromptInfo {
  mode: AnalysisMode;
  auditType: AdvancedAuditResult['auditType'];
  appliedSpecializations: AdvancedAuditResult['appliedSpecializations'];
  completionStatus: AdvancedAuditResult['completionStatus'];
  repairApplied: AdvancedAuditResult['repairApplied'];
  pipelineStatus: 'completed' | 'failed' | 'fallback';
}

// ============================================================
// 🔥 Canonical Envelope – فقط فیلدهای پاکت‌نامه در Root
// ============================================================

export const SnippetSchema = z.object({
  // ===== شناسه و پاکت‌نامه =====
  id: z.string().uuid(),
  slug: z.string().min(1),
  raw_code: z.string(),
  language: z.string().min(1),
  is_public: z.boolean(),
  created_at: z.string().datetime(),

  // ===== اطلاعات کاربر =====
  username: z.string().optional(),
  github_username: z.string().optional(),
  avatar_url: z.string().url().optional(),
  card_image_url: z.string().url().optional(),

  // ===== داده‌های تحلیلی (فقط در اینجا) =====
  audit_result: AdvancedAuditResultSchema,

  // ===== فیلدهای کمکی (برای نمایش Legacy) =====
  card_title: z.string().optional(),
  key_concept: z.string().optional(),
  what_this_code_does: z.string().optional(),
  linkedin_post: z.string().optional(),

  // ===== Line-by-line و Prompt =====
  line_explanations: z.any().optional(),
  generated_prompt: z.string().optional(),
});
// ❌ .catchall(z.any()) حذف شد – چون داده‌های قدیمی وجود ندارند

export type Snippet = z.infer<typeof SnippetSchema>;
export type SnippetData = Snippet;
export const SnippetDataSchema = SnippetSchema;

// ============================================================
// Legacy types (برای سازگاری با کدهای قدیمی – در صورت نیاز)
// ============================================================

// ... (بقیه تایپ‌های Legacy در صورت لزوم) ...

// ============================================================
// LegacyGenerateResponse
// ============================================================

export const LegacyGenerateResponseSchema = z.object({
  analysis: z.string().optional(),
  card_title: z.string().optional(),
  key_concept: z.string().optional(),
  what_this_code_does: z.string().optional(),
  debug_analysis: z.string().optional(),
  optimization: z.string().optional(),
  codeWalkthrough: z.any().optional(),
  whatWorksWell: z.any().optional(),
  bugsAndRiskyCases: z.any().optional(),
  edgeCases: z.any().optional(),
  performanceAnalysis: z.any().optional(),
  securityAnalysis: z.any().optional(),
  productionReadiness: z.any().optional(),
  recommendedImprovements: z.any().optional(),
  improvedCode: z.any().optional(),
  suggestedTests: z.any().optional(),
  scorecard: z.any().optional(),
  finalVerdict: z.any().optional(),
  linkedin_post: z.string().optional(),
  error: z.string().optional(),
  findings: z.any().optional(),
  executionOverview: z.any().optional(),
  architecturalObservations: z.any().optional(),
  recommendedActions: z.any().optional(),
  complexity: z.any().optional(),
  verdict: z.any().optional(),
  limitations: z.any().optional(),
  analysisCoverage: z.any().optional(),
  completionStatus: z.any().optional(),
  repairApplied: z.any().optional(),
  appliedSpecializations: z.any().optional(),
  title: z.any().optional(),
  summary: z.any().optional(),
  debug_trace: z.any().optional(),
  audit_result: z.any().optional(),
});
export type LegacyGenerateResponse = z.infer<typeof LegacyGenerateResponseSchema>;

// ============================================================
// CreateSnippetResponse
// ============================================================

export type CreateSnippetResponse =
  | {
      success: true;
      id: string;
      slug: string;
      url: string;
      username?: string | null;
      github_username?: string | null;
    }
  | {
      success: false;
      error: string;
    };

// ============================================================
// UI State
// ============================================================

export interface LineExplanation {
  lineNumber: number;
  code?: string;
  explanation: string;
}

export interface ModeOutput {
  snippet: Snippet | null;
  fullAnalysis: LegacyGenerateResponse | null;
  lineExplanations: LineExplanation[];
  generatedPrompt: string;
}

export type OutputsByMode = {
  [K in AnalysisMode]: ModeOutput;
};

export interface AppState {
  code: string;
  language: string;
  mode: AnalysisMode;
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

// ============================================================
// Future canonical API contract
// ============================================================

export type CanonicalGenerateResponse =
  | {
      success: true;
      data: AdvancedAuditResult;
    }
  | {
      success: false;
      error: string;
      code?: string;
    };