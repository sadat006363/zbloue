// lib/analysis/prompts/generic.ts

import { getBaseSystemInstructions } from './base';

export function buildGenericAdvancedPrompt(
  numberedCode: string,
  language: string
): string {
  return `
${getBaseSystemInstructions()}

==================== GENERIC ADVANCED AUDIT ====================

Analyze the following ${language} code for correctness, security, error handling, performance, resource management, and production readiness.

<untrusted-source-code>
${numberedCode}
</untrusted-source-code>

==================== REQUIRED ANALYSIS DIMENSIONS ====================

1. Correctness:
   - Runtime bugs and logical flaws
   - Edge cases
   - Input validation
   - Error handling

2. Security:
   - Authentication/authorization
   - Data exposure
   - Cryptographic practices
   - Injection vulnerabilities

3. Performance:
   - Time and space complexity
   - Bottlenecks
   - Resource consumption

4. Resource Management:
   - Lifecycle management
   - Leak detection
   - Cleanup procedures

5. Production Readiness:
   - Monitoring and observability
   - Configuration management
   - Failover and retry logic

Output must follow the AdvancedAuditResult schema exactly.
`;
}