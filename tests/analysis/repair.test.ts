// tests/analysis/repair.test.ts

import { repairAudit } from '@/lib/analysis/repair';
import { type AuditValidationResult } from '@/lib/analysis/types';

// Mock OpenAI call
jest.mock('@/lib/openaiClient', () => ({
  callOpenAI: jest.fn().mockResolvedValue(JSON.stringify({
    schemaVersion: '1.0',
    auditType: 'generic',
    status: 'repaired',
    language: 'javascript',
    summary: 'Repaired audit',
    executionOverview: { entryPoints: [], taskSubmissionPoints: [], blockingWaitPoints: [], sharedResources: [], resourceLifecycle: [] },
    findings: [],
    architecturalObservations: [],
    recommendedActions: [],
    suggestedTests: [],
    complexity: { time: 'O(1)', space: 'O(1)', resourceGrowth: 'O(1)', assumptions: [] },
    scorecard: {
      correctness: { score: 80, reason: 'Good', relatedFindings: [] },
      concurrencySafety: { score: 80, reason: 'Good', relatedFindings: [] },
      liveness: { score: 80, reason: 'Good', relatedFindings: [] },
      errorHandling: { score: 80, reason: 'Good', relatedFindings: [] },
      resourceManagement: { score: 80, reason: 'Good', relatedFindings: [] },
      maintainability: { score: 80, reason: 'Good', relatedFindings: [] },
      productionReadiness: { score: 80, reason: 'Good', relatedFindings: [] },
    },
    verdict: { status: 'approved', explanation: 'OK' },
    limitations: [],
    improvedCode: { available: false, code: null, notes: 'N/A' },
    linkedin_post: 'Repaired',
  })),
}));

describe('Repair Pipeline', () => {
  const validationResult: AuditValidationResult = {
    structurallyValid: false,
    semanticallyComplete: false,
    issues: [
      {
        code: 'LINKEDIN_POST_MISSING',
        severity: 'error',
        message: 'linkedin_post is required',
        relatedLines: [],
        expectedCoverage: 'linkedin_post must be non-empty',
      },
    ],
    repairRequired: true,
  };

  test('repair returns valid audit', async () => {
    const result = await repairAudit(
      '1: console.log("test")',
      '{}',
      validationResult,
      'javascript',
      'generic'
    );
    expect(result).not.toBeNull();
    expect(result?.linkedin_post).toBe('Repaired');
    expect(result?.status).toBe('repaired');
  });

  test('repair preserves existing valid fields', async () => {
    const result = await repairAudit(
      '1: console.log("test")',
      JSON.stringify({ summary: 'Original summary' }),
      validationResult,
      'javascript',
      'generic'
    );
    expect(result).not.toBeNull();
    expect(result?.summary).toBe('Original summary');
  });
});