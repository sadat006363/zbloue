// lib/analysis/types.ts

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Confidence = 'definite' | 'likely' | 'conditional';
export type AuditType = 'generic' | 'concurrency';
export type AuditStatus = 'complete' | 'repaired' | 'partially_complete' | 'failed_validation';

export type FindingCategory =
  | 'liveness'
  | 'thread-starvation'
  | 'deadlock'
  | 'queue-misuse'
  | 'duplicate-submission'
  | 'race-condition'
  | 'shared-state'
  | 'configuration'
  | 'resource-lifecycle'
  | 'timeout'
  | 'interruption'
  | 'cancellation'
  | 'retry'
  | 'error-handling'
  | 'architectural-duplication'
  | 'api-semantics'
  | 'performance'
  | 'security'
  | 'maintainability'
  | 'other';

export interface EvidenceItem {
  startLine: number;
  endLine: number;
  code: string;
  explanation: string;
}

export interface AuditFinding {
  id: string;
  title: string;
  category: FindingCategory;
  severity: Severity;
  confidence: Confidence;
  evidence: EvidenceItem[];
  executionPath: string[];
  triggerConditions: string[];
  consequence: string;
  technicalExplanation: string;
  remediation: string;
  relatedSymbols: string[];
  testToReproduce: {
    title: string;
    setup: string[];
    steps: string[];
    expectedResult: string;
  } | null;
}

export interface AuditScorecard {
  correctness: number;
  concurrencySafety: number;
  liveness: number;
  errorHandling: number;
  resourceManagement: number;
  maintainability: number;
  productionReadiness: number;
}

export interface AdvancedAuditResult {
  schemaVersion: '1.0';
  auditType: AuditType;
  status: AuditStatus;
  language: string;
  summary: string;
  executionOverview: {
    entryPoints: string[];
    taskSubmissionPoints: string[];
    blockingWaitPoints: string[];
    sharedResources: string[];
    resourceLifecycle: string[];
  };
  findings: AuditFinding[];
  architecturalObservations: Array<{
    title: string;
    explanation: string;
    relatedFindingIds: string[];
  }>;
  recommendedActions: Array<{
    priority: number;
    severity: Severity;
    title: string;
    action: string;
    relatedFindingIds: string[];
  }>;
  suggestedTests: Array<{
    title: string;
    purpose: string;
    setup: string[];
    steps: string[];
    expectedResult: string;
  }>;
  complexity: {
    time: string;
    space: string;
    resourceGrowth: string;
    assumptions: string[];
  };
  scorecard: AuditScorecard;
  verdict: {
    status:
      | 'not-production-ready'
      | 'requires-major-changes'
      | 'requires-minor-changes'
      | 'production-ready-with-monitoring';
    explanation: string;
  };
  limitations: string[];
}

export interface ValidationIssue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  relatedLines: number[];
  expectedCoverage: string;
}

export interface AuditValidationResult {
  structurallyValid: boolean;
  semanticallyComplete: boolean;
  issues: ValidationIssue[];
  repairRequired: boolean;
}

export interface DetectorSignal {
  type: string;
  value: string;
  line: number;
  weight: number;
}

export interface DetectorResult {
  requiresConcurrencyAudit: boolean;
  score: number;
  signals: DetectorSignal[];
}