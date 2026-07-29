// tests/analysis/schema.test.ts

import {
  AdvancedAuditResultSchema,
  SeveritySchema,
  ConfidenceSchema,
  VerdictStatusSchema,
  type AdvancedAuditResult,
} from '@/lib/analysis/schema';

describe('Canonical Schema', () => {
  // ============================================================
  // Valid fixture with all required fields
  // ============================================================

  const validAudit: AdvancedAuditResult = {
    schemaVersion: '1.0.0',
    auditType: 'comprehensive',
    appliedSpecializations: [],
    completionStatus: 'complete',
    repairApplied: false,
    title: 'Simple add function',
    language: 'javascript',
    summary: 'A simple add function.',
    analysisCoverage: [
      { dimension: 'correctness', status: 'analyzed', summary: 'Correctness analysis', limitation: null },
      { dimension: 'security', status: 'not-applicable', summary: 'No security concerns', limitation: null },
      { dimension: 'concurrency', status: 'not-applicable', summary: 'No concurrency', limitation: null },
      { dimension: 'liveness', status: 'not-applicable', summary: 'No liveness issues', limitation: null },
      { dimension: 'performance', status: 'analyzed', summary: 'Performance is O(1)', limitation: null },
      { dimension: 'resource-management', status: 'not-applicable', summary: 'No resources', limitation: null },
      { dimension: 'error-handling', status: 'analyzed', summary: 'Basic error handling', limitation: null },
      { dimension: 'input-validation', status: 'not-applicable', summary: 'No input', limitation: null },
      { dimension: 'data-integrity', status: 'not-applicable', summary: 'No data', limitation: null },
      { dimension: 'api-design', status: 'analyzed', summary: 'Simple API', limitation: null },
      { dimension: 'architecture', status: 'not-applicable', summary: 'No architecture', limitation: null },
      { dimension: 'maintainability', status: 'analyzed', summary: 'Simple and readable', limitation: null },
      { dimension: 'testability', status: 'analyzed', summary: 'Easy to test', limitation: null },
      { dimension: 'observability', status: 'not-applicable', summary: 'No logging', limitation: null },
      { dimension: 'compatibility', status: 'not-applicable', summary: 'No compatibility issues', limitation: null },
    ],
    executionOverview: {
      entryPoints: ['add'],
      taskSubmissionPoints: [],
      blockingWaitPoints: [],
      sharedResources: [],
      resourceLifecycle: [],
    },
    findings: [],
    architecturalObservations: [],
    recommendedActions: [],
    suggestedTests: [],
    complexity: {
      applicable: true,
      expression: 'O(1)',
      explanation: 'Constant time complexity.',
      variables: [{ symbol: 'n', definition: 'size of input' }],
      assumptions: ['Input size is bounded.'],
    },
    scorecard: {
      correctness: { applicable: true, score: 80, reason: 'Correct logic', relatedFindingIds: [] },
      concurrencySafety: { applicable: false, score: null, reason: 'No concurrency primitives', relatedFindingIds: [] },
      liveness: { applicable: false, score: null, reason: 'No liveness issues', relatedFindingIds: [] },
      errorHandling: { applicable: true, score: 70, reason: 'Basic error handling', relatedFindingIds: [] },
      resourceManagement: { applicable: true, score: 80, reason: 'Resources managed', relatedFindingIds: [] },
      maintainability: { applicable: true, score: 85, reason: 'Simple and readable', relatedFindingIds: [] },
      productionReadiness: { applicable: true, score: 75, reason: 'Ready for production', relatedFindingIds: [] },
    },
    verdict: {
      status: 'approved',
      explanation: 'All good',
    },
    limitations: [],
    improvedCode: {
      available: false,
      code: null,
      notes: 'No safe focused patch can be produced.',
    },
    linkedinPost: 'Simple add function reviewed.',
  };

  // ============================================================
  // Tests
  // ============================================================

  test('accepts a fully valid audit result', () => {
    expect(() => AdvancedAuditResultSchema.parse(validAudit)).not.toThrow();
  });

  test('rejects score values outside 0-100', () => {
    const invalid = { ...validAudit };
    invalid.scorecard.correctness.score = 150;
    expect(() => AdvancedAuditResultSchema.parse(invalid)).toThrow();
  });

  test('rejects missing required fields', () => {
    const invalid = { ...validAudit };
    delete (invalid as any).summary;
    expect(() => AdvancedAuditResultSchema.parse(invalid)).toThrow();
  });

  test('rejects invalid verdict enum', () => {
    const invalid = { ...validAudit };
    (invalid.verdict as any).status = 'invalid-status';
    expect(() => AdvancedAuditResultSchema.parse(invalid)).toThrow();
  });

  test('rejects malformed improvedCode', () => {
    const invalid = { ...validAudit };
    invalid.improvedCode = { available: true, code: null, notes: '' } as any;
    expect(() => AdvancedAuditResultSchema.parse(invalid)).toThrow();
  });

  test('enforces linkedinPost length (1-300)', () => {
    const invalid = { ...validAudit };
    invalid.linkedinPost = '';
    expect(() => AdvancedAuditResultSchema.parse(invalid)).toThrow();
  });

  test('rejects extra fields due to .strict()', () => {
    const invalid = { ...validAudit, extraField: 'should fail' };
    expect(() => AdvancedAuditResultSchema.parse(invalid)).toThrow();
  });

  // ============================================================
  // Enum tests
  // ============================================================

  test('SeveritySchema accepts valid values', () => {
    const validValues = ['critical', 'high', 'medium', 'low', 'info'];
    validValues.forEach((v) => {
      expect(() => SeveritySchema.parse(v)).not.toThrow();
    });
    expect(() => SeveritySchema.parse('invalid')).toThrow();
  });

  test('ConfidenceSchema accepts valid values', () => {
    const validValues = ['definite', 'likely', 'conditional'];
    validValues.forEach((v) => {
      expect(() => ConfidenceSchema.parse(v)).not.toThrow();
    });
    expect(() => ConfidenceSchema.parse('unknown')).toThrow();
  });

  test('VerdictStatusSchema accepts valid values', () => {
    const validValues = [
      'not-production-ready',
      'requires-major-changes',
      'requires-changes',
      'requires-minor-changes',
      'approved-with-suggestions',
      'approved',
    ];
    validValues.forEach((v) => {
      expect(() => VerdictStatusSchema.parse(v)).not.toThrow();
    });
    expect(() => VerdictStatusSchema.parse('invalid')).toThrow();
  });
});