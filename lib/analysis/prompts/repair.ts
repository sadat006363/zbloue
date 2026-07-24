// lib/analysis/prompts/repair.ts

import type { ValidationIssue } from '../types';
import { getBaseSystemInstructions } from './base';
import {
  buildSafePromptPayload,
  buildUntrustedDataSection,
  type PromptContext,
} from '../prompt-context';

/**
 * ساخت پرامپت تعمیر برای تصحیح خروجی نامعتبر
 */
export function buildRepairPrompt(
  context: PromptContext,
  previousAudit: string,
  validationIssues: ValidationIssue[],
  missingCoverage: string[]
): string {
  const { serializedCode, serializedSourceLanguage, serializedResponseLanguage } =
    buildSafePromptPayload(context);

  const hasIssues = validationIssues.length > 0;
  const hasMissingCoverage = missingCoverage.length > 0;

  // ===== سریال‌سازی ایمن ورودی‌ها =====
  const serializedPreviousAudit = JSON.stringify(previousAudit)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');

  const issuesText = hasIssues
    ? validationIssues
        .map((issue) => {
          const expected =
            typeof issue.expectedCoverage === 'string' &&
            issue.expectedCoverage.trim().length > 0
              ? ` (expected: ${issue.expectedCoverage.trim()})`
              : '';
          return `- [${issue.severity}] ${issue.message}${expected}`;
        })
        .join('\n')
    : '✅ No validation issues found.';

  const serializedIssues = JSON.stringify(issuesText)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');

  const coverageText = hasMissingCoverage
    ? missingCoverage.map((c) => `- ${c}`).join('\n')
    : '✅ All required coverage areas are addressed.';

  const serializedCoverage = JSON.stringify(coverageText)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');

  return `
${getBaseSystemInstructions()}

==================== REPAIRING INCOMPLETE TECHNICAL AUDIT ====================

You are repairing an incomplete technical audit.
The previous response failed validation or needs refinement.
Do NOT restart with a generic review.
Correct the specified defects and return the complete corrected JSON object.

**IMPORTANT: CANONICAL SCHEMA RULES**
- auditType must be "comprehensive"
- completionStatus must be "complete" (or "partially-complete" if issues remain)
- repairApplied must be true
- appliedSpecializations must be set based on the audit type (["concurrency"] if concurrency was analyzed)
- All other fields follow the canonical AdvancedAuditResult schema

==================== ORIGINAL SOURCE CODE ====================

${buildUntrustedDataSection('source-code-json', serializedCode)}

==================== CONTEXT ====================

Source programming language: ${serializedSourceLanguage}
Response language: ${serializedResponseLanguage}

==================== PREVIOUS AUDIT TO REPAIR ====================

${buildUntrustedDataSection('previous-audit-json', serializedPreviousAudit)}

==================== VALIDATION FAILURES ====================

${buildUntrustedDataSection('validation-issues', serializedIssues)}

==================== REQUIRED MISSING COVERAGE ====================

${buildUntrustedDataSection('missing-coverage', serializedCoverage)}

==================== REPAIR RULES (MANDATORY) ====================

1. PRESERVE VALID CONTENT
   - Preserve every valid existing finding ID exactly as it appears.
   - Do NOT renumber, re-index, or reuse existing IDs.
   - Keep all valid findings, their original IDs, and their evidence intact.

2. REPAIR ONLY INVALID CONTENT
   - Add or correct only what is necessary to fix the validation failures.
   - However, analyze all explicitly listed missing-coverage areas and add any
     source-supported findings required to complete them.

3. FINDING ID PRESERVATION
   - Find the highest syntactically valid finding ID appearing anywhere in the
     previous audit, including findings that may be removed during repair.
   - Assign new IDs above that number.
   - Never reuse any ID that appeared in the previous audit.

4. VALIDATE FINDINGS AND EVIDENCE
   - Verify EVERY finding against the supplied numbered source code.
   - Each finding must have at least one valid evidence item.
   - For each evidence:
     - startLine and endLine must be positive integers.
     - endLine must be >= startLine.
     - line numbers must exist within the source code.
     - code snippet must be the exact source excerpt (no ellipses).
     - explanation must describe why that code is evidence.
   - If a finding cannot be supported by valid line numbers, do NOT return it.
   - If a valid previous finding is no longer verifiable, remove it.
   - When removing a finding, also remove or update dependent references.

5. PREVENT DANGLING REFERENCES
   - After adding, removing, or changing findings, check all references:
     - architecturalObservations[].relatedFindingIds
     - recommendedActions[].relatedFindingIds
     - scorecard.*.relatedFindings
     - suggestedTests[].relatedFindingIds (if present)
   - Every relatedFindingId must point to an existing finding in the final output.
   - No dangling IDs, duplicate IDs, or invented IDs.

6. ENSURE CANONICAL FIELDS ARE CORRECT
   - auditType: "comprehensive"
   - completionStatus: "complete" (if all errors fixed) or "partially-complete"
   - repairApplied: true
   - appliedSpecializations: [] or ["concurrency"]
   - schemaVersion: "1.0"

7. SCORECARD (0-100 OBJECT WITH APPLICABLE FLAG)
   - Each category is an object: { applicable, score, reason, relatedFindings }
   - If applicable: true → score is 0-100, reason is required
   - If applicable: false → score is null, reason explains why
   - relatedFindings must reference existing finding IDs

8. IMPROVED CODE (DISCRIMINATED UNION)
   - Must always be present:
     { "available": true, "code": "...", "notes": "..." }
     or
     { "available": false, "code": null, "notes": "..." }
   - available === true → code must be non-empty
   - available === false → code must be null

9. COMPLEXITY (DISCRIMINATED UNION)
   - { "applicable": true, "expression": "...", "explanation": "...", "variables": [], "assumptions": [] }
   - or { "applicable": false, "expression": null, "explanation": null, "variables": [], "assumptions": [] }

10. LINKEDIN POST
    - Max 300 characters, min 1 character.
    - Must be a trimmed string.

11. INTERNAL PRE-OUTPUT VALIDATION
    Before returning the JSON, ensure:
    - All required fields are present.
    - No required string is empty after trimming.
    - All enums match the schema.
    - All finding IDs are valid and unique.
    - All references point to existing findings.
    - Every finding has at least one evidence item.
    - All line numbers are within the source bounds.
    - Scorecard values are 0-100 objects with applicable flag.
    - Verdict status is one of the 6 canonical values.
    - improvedCode is present with correct invariants.
    - complexity follows the discriminated union.
    - linkedin_post length is between 1 and 300.
    - The output is parseable JSON.
    - No Markdown fences, comments, or extra text.

12. RETURN JSON ONLY
    - Output only valid JSON.
    - Do NOT include Markdown fences, comments, or any text before or after the JSON.
    - Do NOT explain the changes in the output.

==================== CANONICAL OUTPUT CONTRACT ====================

{
  "schemaVersion": "1.0",
  "auditType": "comprehensive",
  "appliedSpecializations": [],
  "completionStatus": "complete",
  "repairApplied": true,
  "title": "Concise audit title",
  "language": "javascript",
  "responseLanguage": "English",
  "analysisCoverage": [
    { "dimension": "correctness", "status": "analyzed", "summary": "Analysis of correctness dimension.", "limitation": null },
    // ... all 15 dimensions
  ],
  "summary": "Concise summary of findings.",
  "executionOverview": {
    "entryPoints": [],
    "taskSubmissionPoints": [],
    "blockingWaitPoints": [],
    "sharedResources": [],
    "resourceLifecycle": []
  },
  "findings": [],
  "architecturalObservations": [],
  "recommendedActions": [],
  "suggestedTests": [],
  "complexity": {
    "applicable": true,
    "expression": "O(1)",
    "explanation": "Constant time complexity.",
    "variables": [{ "symbol": "n", "definition": "size of input" }],
    "assumptions": ["Input size is bounded."]
  },
  "scorecard": {
    "correctness": { "applicable": true, "score": 80, "reason": "Good", "relatedFindings": [] },
    "concurrencySafety": { "applicable": false, "score": null, "reason": "No concurrency", "relatedFindings": [] },
    "liveness": { "applicable": false, "score": null, "reason": "No liveness issues", "relatedFindings": [] },
    "errorHandling": { "applicable": true, "score": 70, "reason": "Basic error handling", "relatedFindings": [] },
    "resourceManagement": { "applicable": true, "score": 80, "reason": "Resources managed", "relatedFindings": [] },
    "maintainability": { "applicable": true, "score": 85, "reason": "Simple and readable", "relatedFindings": [] },
    "productionReadiness": { "applicable": true, "score": 75, "reason": "Ready for production", "relatedFindings": [] }
  },
  "verdict": {
    "status": "requires-changes",
    "explanation": "Justification based on findings."
  },
  "limitations": ["Based solely on supplied source."],
  "improvedCode": {
    "available": false,
    "code": null,
    "notes": "No safe focused patch can be produced from the supplied context."
  },
  "linkedin_post": "Professional summary, max 300 chars."
}

==================== ENUM REFERENCE ====================

Confidence: definite, likely, conditional
Severity: critical, high, medium, low, info
Finding categories: correctness, concurrency, security, reliability, error-handling, resource-management, performance, data-integrity, input-validation, api-design, configuration, architecture, maintainability, testability, observability, compatibility, other
Mechanisms: deadlock, thread-starvation, race-condition, duplicate-submission, queue-misuse, blocking-wait, shared-state, configuration-collision, resource-leak, timeout-misuse, interruption-loss, cancellation-failure, retry-amplification
Verdict statuses: not-production-ready, requires-major-changes, requires-changes, requires-minor-changes, approved-with-suggestions, approved

==================== ANTI-HALLUCINATION (CRITICAL) ====================

- Do not invent missing code.
- Do not claim a definite bug when required runtime conditions are unknown.
- Use "conditional" confidence for hazards that depend on external factors.
- Use "definite" only when the defect follows directly from the supplied source.
- Findings without evidence are invalid and must not be returned.
- Only cite code and line ranges present in the provided source.

==================== REPAIR OUTPUT ====================

Return ONLY the complete corrected JSON object.
Do NOT include any text before or after the JSON.
`;
}