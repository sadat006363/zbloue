// tests/analysis/persistence.test.ts
import { toSnippetInsert, isValidSnippetContext } from '@/lib/analysis/to-snippet';
import { type AdvancedAuditResult } from '@/lib/analysis/schema';

describe('Persistence Mapper', () => {
  const validAudit: AdvancedAuditResult = {
    schemaVersion: '1.0.0',
    auditType: 'comprehensive',
    appliedSpecializations: [],
    completionStatus: 'complete',
    repairApplied: false,
    title: 'Test Analysis',
    language: 'javascript',
    summary: 'Test',
    analysisCoverage: [
      { dimension: 'correctness', status: 'analyzed', summary: 'Correctness', limitation: null },
      { dimension: 'security', status: 'not-applicable', summary: 'No security', limitation: null },
      { dimension: 'concurrency', status: 'not-applicable', summary: 'No concurrency', limitation: null },
      { dimension: 'liveness', status: 'not-applicable', summary: 'No liveness', limitation: null },
      { dimension: 'performance', status: 'analyzed', summary: 'O(1)', limitation: null },
      { dimension: 'resource-management', status: 'not-applicable', summary: 'No resources', limitation: null },
      { dimension: 'error-handling', status: 'analyzed', summary: 'Basic', limitation: null },
      { dimension: 'input-validation', status: 'not-applicable', summary: 'No input', limitation: null },
      { dimension: 'data-integrity', status: 'not-applicable', summary: 'No data', limitation: null },
      { dimension: 'api-design', status: 'analyzed', summary: 'Simple', limitation: null },
      { dimension: 'architecture', status: 'not-applicable', summary: 'No architecture', limitation: null },
      { dimension: 'maintainability', status: 'analyzed', summary: 'Simple', limitation: null },
      { dimension: 'testability', status: 'analyzed', summary: 'Testable', limitation: null },
      { dimension: 'observability', status: 'not-applicable', summary: 'No logging', limitation: null },
      { dimension: 'compatibility', status: 'not-applicable', summary: 'No issues', limitation: null },
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
      applicable: false,
      expression: null,
      explanation: null,
      variables: [],
      assumptions: [],
    },
    scorecard: {
      correctness: { applicable: true, score: 80, reason: 'Good', relatedFindingIds: [] },
      concurrencySafety: { applicable: false, score: null, reason: 'No concurrency', relatedFindingIds: [] },
      liveness: { applicable: false, score: null, reason: 'No liveness', relatedFindingIds: [] },
      errorHandling: { applicable: true, score: 70, reason: 'Basic', relatedFindingIds: [] },
      resourceManagement: { applicable: true, score: 80, reason: 'Managed', relatedFindingIds: [] },
      maintainability: { applicable: true, score: 85, reason: 'Simple', relatedFindingIds: [] },
      productionReadiness: { applicable: true, score: 75, reason: 'Ready', relatedFindingIds: [] },
    },
    verdict: { status: 'approved', explanation: 'OK' },
    limitations: [],
    improvedCode: { available: false, code: null, notes: 'N/A' },
    linkedinPost: 'Test post',
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
    // linkedin_post دیگر در دیتابیس وجود ندارد، از audit_result استفاده می‌شود
    expect(row.audit_result).toEqual(validAudit);
    // improved_code_jsonb دیگر استفاده نمی‌شود
    // بررسی می‌کنیم که فیلدهای legacy null باشند
    expect(row.card_title).toBeUndefined();
  });
});