// tests/analysis/semantic-validator.test.ts

import { validateSemanticIntegrity } from '@/lib/analysis/semantic-validator';
import { type AdvancedAuditResult } from '@/lib/analysis/schema';

describe('Semantic Validator', () => {
  const validAudit: AdvancedAuditResult = {
    schemaVersion: '1.0',
    auditType: 'generic',
    status: 'complete',
    language: 'javascript',
    summary: 'Test',
    executionOverview: {
      entryPoints: [],
      taskSubmissionPoints: [],
      blockingWaitPoints: [],
      sharedResources: [],
      resourceLifecycle: [],
    },
    findings: [
      {
        id: 'F-001',
        title: 'Finding 1',
        category: 'other',
        severity: 'medium',
        confidence: 'definite',
        evidence: [{ startLine: 1, endLine: 1, code: 'test', explanation: 'test' }],
        executionPath: ['step1'],
        triggerConditions: ['condition'],
        consequence: 'consequence',
        technicalExplanation: 'explanation',
        remediation: 'fix',
        relatedSymbols: [],
        testToReproduce: null,
      },
    ],
    architecturalObservations: [],
    recommendedActions: [
      {
        priority: 1,
        severity: 'medium',
        title: 'Action',
        action: 'Do something',
        relatedFindingIds: ['F-001'],
      },
    ],
    suggestedTests: [],
    complexity: { time: 'O(1)', space: 'O(1)', resourceGrowth: 'O(1)', assumptions: [] },
    scorecard: {
      correctness: { score: 80, reason: 'Good', relatedFindings: ['F-001'] },
      concurrencySafety: { score: 80, reason: 'Good', relatedFindings: [] },
      liveness: { score: 80, reason: 'Good', relatedFindings: [] },
      errorHandling: { score: 80, reason: 'Good', relatedFindings: [] },
      resourceManagement: { score: 80, reason: 'Good', relatedFindings: [] },
      maintainability: { score: 80, reason: 'Good', relatedFindings: [] },
      productionReadiness: { score: 80, reason: 'Good', relatedFindings: [] },
    },
    verdict: { status: 'approved', explanation: 'All good' },
    limitations: [],
    improvedCode: { available: false, code: null, notes: 'N/A' },
    linkedin_post: 'OK',
  };

  test('accepts valid audit with correct references', () => {
    const result = validateSemanticIntegrity(validAudit);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('detects duplicate finding IDs', () => {
    const invalid = { ...validAudit };
    invalid.findings = [
      { ...validAudit.findings[0], id: 'F-001' },
      { ...validAudit.findings[0], id: 'F-001' },
    ];
    const result = validateSemanticIntegrity(invalid);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_FINDING_ID')).toBe(true);
  });

  test('detects dangling relatedFindingIds', () => {
    const invalid = { ...validAudit };
    invalid.recommendedActions[0].relatedFindingIds = ['F-999'];
    const result = validateSemanticIntegrity(invalid);
    expect(result.errors.some((e) => e.code === 'INVALID_REFERENCE')).toBe(true);
  });

  test('detects improvedCode.available inconsistency', () => {
    const invalid = { ...validAudit };
    invalid.improvedCode = { available: true, code: null, notes: 'test' };
    const result = validateSemanticIntegrity(invalid);
    expect(result.errors.some((e) => e.code === 'IMPROVED_CODE_AVAILABLE_BUT_EMPTY')).toBe(true);
  });

  test('detects verdict inconsistency with critical findings', () => {
    const invalid = { ...validAudit };
    invalid.findings[0].severity = 'critical';
    invalid.verdict.status = 'approved';
    const result = validateSemanticIntegrity(invalid);
    expect(result.warnings.some((e) => e.code === 'VERDICT_INCONSISTENT_CRITICAL')).toBe(true);
  });
});