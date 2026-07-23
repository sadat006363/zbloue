// tests/analysis/persistence.test.ts

import { toSnippetInsert, legacyRowToAudit, isValidSnippetContext } from '@/lib/analysis/to-snippet';
import { type AdvancedAuditResult } from '@/lib/analysis/schema';

describe('Persistence Mapper', () => {
  const validAudit: AdvancedAuditResult = {
    schemaVersion: '1.0',
    auditType: 'generic',
    status: 'complete',
    language: 'javascript',
    summary: 'Test',
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
    linkedin_post: 'Test post',
  };

  const context = {
    rawCode: 'function add(a, b) { return a + b; }',
    sourceLanguage: 'javascript',
    slug: 'test-slug',
    username: 'test-user',
  };

  test('validates context', () => {
    expect(() => isValidSnippetContext(context)).not.toThrow();
    expect(() => isValidSnippetContext({ ...context, rawCode: '' })).toThrow();
  });

  test('maps canonical audit to snippet insert', () => {
    const row = toSnippetInsert(validAudit, context);
    expect(row.slug).toBe('test-slug');
    expect(row.raw_code).toBe(context.rawCode);
    expect(row.linkedin_post).toBe('Test post');
    expect(row.audit_result).toEqual(validAudit);
    expect(row.improved_code_jsonb).toEqual({ available: false, code: null, notes: 'N/A' });
  });

  test('converts legacy row to audit', () => {
    const legacyRow = {
      language: 'javascript',
      key_concept: 'Test concept',
      linkedin_post: 'Legacy post',
      improved_code: 'console.log("fixed")',
      final_verdict_approved: true,
      final_verdict_summary: 'Legacy verdict',
    };
    const result = legacyRowToAudit(legacyRow);
    expect(result).not.toBeNull();
    expect(result?.language).toBe('javascript');
    expect(result?.improvedCode?.code).toBe('console.log("fixed")');
  });
});