// tests/analysis/schema.test.ts

import {
  AdvancedAuditResultSchema,
  SeveritySchema,
  ConfidenceSchema,
  VerdictStatusSchema,
  type AdvancedAuditResult,
} from '@/lib/analysis/schema';

describe('Canonical Schema', () => {
  // ===== Valid fixture =====
  const validAudit: AdvancedAuditResult = {
    schemaVersion: '1.0',
    auditType: 'generic',
    status: 'complete',
    language: 'javascript',
    summary: 'A simple add function.',
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
      time: 'O(1)',
      space: 'O(1)',
      resourceGrowth: 'O(1)',
      assumptions: [],
    },
    scorecard: {
      correctness: { score: 80, reason: 'Correct', relatedFindings: [] },
      concurrencySafety: { score: 80, reason: 'No concurrency', relatedFindings: [] },
      liveness: { score: 80, reason: 'No liveness issues', relatedFindings: [] },
      errorHandling: { score: 80, reason: 'No error handling', relatedFindings: [] },
      resourceManagement: { score: 80, reason: 'No resources', relatedFindings: [] },
      maintainability: { score: 80, reason: 'Simple', relatedFindings: [] },
      productionReadiness: { score: 80, reason: 'Simple', relatedFindings: [] },
    },
    verdict: {
      status: 'approved',
      explanation: 'Simple function, no issues',
    },
    limitations: [],
    improvedCode: {
      available: false,
      code: null,
      notes: 'No safe patch available.',
    },
    linkedin_post: 'Simple add function.',
  };

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
    invalid.improvedCode = { available: true, code: null, notes: '' };
    expect(() => AdvancedAuditResultSchema.parse(invalid)).toThrow();
  });

  test('enforces linkedin_post length (1-300)', () => {
    const invalid = { ...validAudit };
    invalid.linkedin_post = '';
    expect(() => AdvancedAuditResultSchema.parse(invalid)).toThrow();
  });

  test('rejects extra fields due to .strict()', () => {
    const invalid = { ...validAudit, extraField: 'should fail' };
    expect(() => AdvancedAuditResultSchema.parse(invalid)).toThrow();
  });
});