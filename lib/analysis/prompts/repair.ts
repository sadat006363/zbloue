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
 * 
 * @param context - تنظیمات پرامپت
 * @param previousAudit - خروجی قبلی (نامعتبر)
 * @param validationIssues - خطاهای اعتبارسنجی
 * @param missingCoverage - پوشش‌های گم‌شده
 * @returns پرامپت کامل برای ارسال به مدل
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

1. PRESERVE THE PREVIOUS AUDIT IDENTITY
   - Preserve every valid existing finding ID exactly as it appears in the previous audit.
   - Do NOT renumber, re-index, or reuse existing IDs.
   - Preserve auditType from previous audit if it is valid (generic or concurrency).

2. REPAIR ONLY INVALID CONTENT
   - Add or correct only what is necessary to fix the validation failures.
   - Keep all valid findings, their original IDs, and their evidence intact.
   - However, analyze all explicitly listed missing-coverage areas and add any
     source-supported findings required to complete them.

3. FINDING ID PRESERVATION
   - Find the highest syntactically valid finding ID appearing anywhere in the
     previous audit, including findings that may be removed during repair.
   - Assign new IDs above that number.
   - Never reuse any ID that appeared in the previous audit, even if the finding was removed.
   - Example: if highest ID is F-009, the next new ID must be F-010.

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

6. ENFORCE SCHEMA FIELDS AND ENUMS
   - Use exactly the canonical enums from AdvancedAuditResultSchema.
   - Confidence: definite, likely, conditional
   - Severity: critical, high, medium, low, info
   - Finding categories: liveness, thread-starvation, deadlock, queue-misuse, duplicate-submission, race-condition, shared-state, configuration, resource-lifecycle, timeout, interruption, cancellation, retry, error-handling, architectural-duplication, api-semantics, performance, security, maintainability, other
   - Verdict statuses: not-production-ready, requires-major-changes, requires-changes, requires-minor-changes, approved-with-suggestions, approved
   - schemaVersion: "1.0"
   - status: "repaired"
   - All required text fields must be non-empty.
   - evidence arrays must have at least one item.
   - executionPath and triggerConditions must each have at least one item.

7. SCORECARD (0-100 OBJECT)
   - Each category MUST be an object: { score, reason, relatedFindings }
   - Scores: 0-100 (NOT 0-10)
   - Every category must have a reason string.
   - relatedFindings must reference existing finding IDs.

8. IMPROVED CODE (MANDATORY)
   - Must always be present:
     {
       "available": boolean,
       "code": string | null,
       "notes": string
     }
   - available === true → code must be non-empty
   - available === false → code must be null
   - notes must explain the decision

9. LINKEDIN POST
   - Max 300 characters, min 1 character.
   - Must be a trimmed string.
   - Must be derived from actual findings.

10. INTERNAL PRE-OUTPUT VALIDATION
    Before returning the JSON, ensure:
    - All required fields are present.
    - No required field is null (unless schema explicitly allows null).
    - No required string is empty after trimming.
    - All enums match the schema.
    - All finding IDs are valid and unique.
    - All references point to existing findings.
    - Every finding has at least one evidence item.
    - All line numbers are within the source bounds.
    - executionPath and triggerConditions meet the minimum length.
    - Scorecard values are 0-100 objects with reason and relatedFindings.
    - Verdict status is one of the 6 canonical values.
    - improvedCode is present with correct invariants.
    - linkedin_post length is between 1 and 300.
    - The output is parseable JSON.
    - No Markdown fences, comments, or extra text.

11. RETURN JSON ONLY
    - Output only valid JSON.
    - Do NOT include Markdown code fences, comments, or any text before or after the JSON.
    - Do NOT explain the changes in the output.

==================== CANONICAL OUTPUT CONTRACT ====================

{
  "schemaVersion": "1.0",
  "auditType": "generic" | "concurrency",
  "status": "repaired",
  "language": "javascript",
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
    "time": "O(1)",
    "space": "O(1)",
    "resourceGrowth": "O(1)",
    "assumptions": []
  },
  "scorecard": {
    "correctness": { "score": 0, "reason": "", "relatedFindings": [] },
    "concurrencySafety": { "score": 0, "reason": "", "relatedFindings": [] },
    "liveness": { "score": 0, "reason": "", "relatedFindings": [] },
    "errorHandling": { "score": 0, "reason": "", "relatedFindings": [] },
    "resourceManagement": { "score": 0, "reason": "", "relatedFindings": [] },
    "maintainability": { "score": 0, "reason": "", "relatedFindings": [] },
    "productionReadiness": { "score": 0, "reason": "", "relatedFindings": [] }
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
Finding categories: liveness, thread-starvation, deadlock, queue-misuse, duplicate-submission, race-condition, shared-state, configuration, resource-lifecycle, timeout, interruption, cancellation, retry, error-handling, architectural-duplication, api-semantics, performance, security, maintainability, other
Verdict statuses: not-production-ready, requires-major-changes, requires-changes, requires-minor-changes, approved-with-suggestions, approved

==================== ANTI-HALLUCINATION (CRITICAL) ====================

- Do not invent missing code.
- Do not claim a definite bug when required runtime conditions are unknown.
- Use "conditional" confidence for hazards that depend on external factors.
- Use "definite" only when the defect follows directly from the supplied source.
- Findings without evidence are invalid and must not be returned.
- Only cite code and line ranges present in the provided source.
- Return null for testToReproduce when evidence is insufficient.

==================== REPAIR OUTPUT ====================

Return ONLY the complete corrected JSON object.
Do NOT include any text before or after the JSON.
`;
}