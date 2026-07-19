// lib/analysis/prompts/repair.ts

import { ValidationIssue } from '../types';

export function buildRepairPrompt(
  numberedCode: string,
  previousAudit: string,
  validationIssues: ValidationIssue[],
  missingCoverage: string[]
): string {
  const issuesText = validationIssues
    .map((i) => `- [${i.severity}] ${i.message} (expected: ${i.expectedCoverage})`)
    .join('\n');

  const coverageText = missingCoverage.map((c) => `- ${c}`).join('\n');

  return `
You are repairing an incomplete technical audit.

The previous response failed validation. Do not restart with a generic review.
Correct the specified defects and return the complete corrected JSON object.

==================== ORIGINAL SOURCE CODE ====================

<untrusted-source-code>
${numberedCode}
</untrusted-source-code>

==================== VALIDATION FAILURES ====================

${issuesText}

==================== REQUIRED MISSING COVERAGE ====================

${coverageText}

==================== REPAIR RULES ====================

1. Preserve valid findings from the previous audit.
2. Add or correct only what is necessary.
3. Verify every critical/high finding against the numbered source.
4. Include exact evidence.
5. Do not invent line numbers.
6. Return only valid JSON.
7. Do not use Markdown fences.
8. Do not include commentary outside JSON.
9. Schema version must be "1.0".
10. Audit type must be "concurrency" or "generic" as appropriate.

==================== PREVIOUS AUDIT (for reference) ====================

${previousAudit}

==================== REPAIR OUTPUT ====================

Return only the complete corrected JSON object matching the AdvancedAuditResult schema.
`;
}