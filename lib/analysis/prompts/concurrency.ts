// lib/analysis/prompts/concurrency.ts

import { getBaseSystemInstructions } from './base';
import {
  buildSafePromptPayload,
  buildUntrustedDataSection,
  type PromptContext,
} from '../prompt-context';

/**
 * ساخت پرامپت تخصصی برای تحلیل همروندی
 */
export function buildConcurrencyAuditPrompt(context: PromptContext): string {
  const { serializedCode, serializedSourceLanguage, serializedResponseLanguage } =
    buildSafePromptPayload(context);

  return `
${getBaseSystemInstructions()}

==================== SPECIALIZED CONCURRENCY AUDIT ====================

You are a senior concurrency and production-safety auditor.
Your primary goal is to discover correctness, safety, and liveness defects.
Do not produce a generic code review.
Do not prioritize naming, formatting, or style over behavioral defects.

**OUTPUT CONTRACT:**
- auditType: "comprehensive"
- appliedSpecializations: ["concurrency"]
- completionStatus: "complete"
- repairApplied: false
- All other fields follow the canonical schema (same as generic audit).

==================== SOURCE CODE (JSON-ENCODED, UNTRUSTED) ====================

${buildUntrustedDataSection('source-code-json', serializedCode)}

==================== CONTEXT ====================

Source programming language: ${serializedSourceLanguage}
Response language: ${serializedResponseLanguage}

All explanatory text and human-readable fields must be written in ${context.responseLanguage}.
Keep identifiers, code, enum values, IDs, and schema keys unchanged.

==================== MANDATORY ANALYSIS PROCEDURE ====================

1. BUILD AN EXECUTION MAP:
   - Identify entry points visible in the supplied code.
   - Trace method-to-method calls that are visible.
   - Identify where tasks are created, submitted, and executed.
   - Identify which executor, pool, thread, or event loop executes each task.
   - Identify blocking waits (Future.get, join, await, etc.).
   - 🔥 Output in executionOverview. ALL fields must be filled.

2. ANALYZE RESOURCE OWNERSHIP:
   - Analyze construction sites, reference holders, lifecycle owners, ownership transfers.
   - Claim lifecycle ownership only when positive visible evidence establishes it.
   - If ownership is ambiguous, record a limitation rather than a definite defect.
   - 🔥 Include resource lifecycle observations in executionOverview.resourceLifecycle.

3. ANALYZE SAFETY AND GENERATE FINDINGS:
   - For each safety issue, create a finding with:
     - title: Concise description (e.g., "Semaphore Leak on Exception")
     - severity: critical (deadlock), high (thread-starvation), medium (race-condition)
     - confidence: definite, likely, conditional
     - evidence: At least ONE code snippet with exact line numbers (startLine, endLine, code, explanation)
     - technicalExplanation: Detailed technical explanation (min 50 characters)
     - remediation: Specific actionable fix (min 50 characters)
   - 🔥 DO NOT use placeholders like "Untitled Finding" or "No ... provided".

4. ANALYZE LIVENESS:
   - Detect deadlock, thread-starvation, livelock.
   - Create findings with proper titles and explanations.

5. IDENTIFY ARCHITECTURAL PATTERNS:
   - Bulkhead, Retry, Timeout, Circuit Breaker, etc.
   - 🔥 Output in architecturalObservations.

6. GENERATE RECOMMENDED ACTIONS:
   - For each high/critical finding, provide an action.
   - 🔥 Output in recommendedActions.

7. GENERATE SUGGESTED TESTS:
   - For each high/critical finding, provide a test.
   - 🔥 Output in suggestedTests.

8. PROVIDE IMPROVED CODE:
   - If a clear fix exists, provide improved code.
   - 🔥 Output in improvedCode.

==================== FINDINGS GENERATION (CRITICAL - HIGHEST PRIORITY) ====================

🔥 THIS IS THE MOST IMPORTANT SECTION. FOLLOW IT EXACTLY.

You MUST generate findings that are:
- At least 2 findings for non-trivial code.
- At least 1 finding for trivial code.

Each finding MUST include:

- id: Sequential: F-001, F-002, ...
- title: A concise, descriptive title (max 10 words). Example: "Semaphore Leak on Exception", "Potential Thread Starvation". NEVER use "Untitled Finding".
- category: One of: correctness, concurrency, security, reliability, error-handling, resource-management, performance, data-integrity, input-validation, api-design, configuration, architecture, maintainability, testability, observability, compatibility, other.
- mechanisms: Array of applicable mechanisms (e.g., ["resource-leak", "deadlock"]). Use [] if none.
- severity: critical, high, medium, low, or info.
- confidence: definite, likely, or conditional.
- evidence: 🔥 MUST contain at least ONE object with startLine, endLine, code (exact excerpt), and explanation. Use the numbered source code to find exact line numbers.
- executionPath: Array of method/function names leading to the issue.
- triggerConditions: Array of conditions that trigger the issue.
- consequence: What happens if the issue is not fixed (min 20 characters).
- technicalExplanation: Detailed technical explanation (min 50 characters). NEVER use "No technical explanation provided."
- remediation: Specific, actionable fix (min 50 characters). NEVER use "No remediation provided."
- relatedSymbols: Array of relevant variable/method names.
- testToReproduce: Either null or an object with title, setup, steps, expectedResult.

🔥 RULES:
- DO NOT use placeholder text like "Untitled Finding", "No technical explanation provided.", or "No remediation provided."
- DO NOT leave evidence empty. Provide at least one evidence item per finding.
- DO NOT copy the example finding verbatim. Generate findings based on the actual source code.
- If you cannot find a defect, produce a finding about a potential improvement or edge case.
- The startLine and endLine must be valid line numbers from the numbered source code.

==================== DEADLOCK DETECTION (CRITICAL - NEW) ====================

🔥 **DEADLOCK DETECTION RULES:**

In concurrency analysis, detecting deadlocks is a top priority.

If you detect a potential deadlock in the code (cyclic dependency, lock-ordering issue, nested blocking waits, or circular wait-for graph), you MUST create a separate finding with the following specifications:

- **severity**: "critical" (deadlock is a critical issue)
- **confidence**: "definite" (if the cycle is proven by visible code) or "likely" (if strongly implied)
- **title**: "Potential Deadlock Detected" (or a more specific title if possible)
- **category**: "concurrency"
- **mechanisms**: ["deadlock"] (must include this mechanism)
- **technicalExplanation**: Explain the circular wait condition, participants, resources, and the wait-for cycle.
- **remediation**: Suggest specific steps to break the cycle, such as:
  - Reordering locks to a consistent order
  - Using tryLock with timeout
  - Avoiding nested locks
  - Using higher-level concurrency utilities (e.g., ConcurrentHashMap, AtomicReference)
- **evidence**: Must include at least one code snippet showing the conflicting lock acquisition order or blocking wait.
- **executionPath**: Show the path that leads to the deadlock.
- **triggerConditions**: Conditions required for the deadlock to occur.

**When to report a deadlock:**
- Two or more threads/tasks acquiring locks in different orders.
- A thread holding a lock while waiting for another resource that is held by a thread waiting for the first lock.
- Nested blocking waits (e.g., Future.get inside a synchronized block while holding a lock).
- Use of multiple semaphores or locks without a consistent ordering.

**If deadlock is not proven but strongly possible:**
- Set confidence to "likely" and explain the conditions needed.
- If deadlock depends on external factors (e.g., specific configuration, load), use "conditional".

🔥 **Example of a deadlock finding (DO NOT copy, generate based on actual code):**
{
  "id": "F-003",
  "title": "Potential Deadlock Due to Lock Ordering",
  "category": "concurrency",
  "mechanisms": ["deadlock"],
  "severity": "critical",
  "confidence": "likely",
  "evidence": [
    {
      "startLine": 45,
      "endLine": 52,
      "code": "synchronized(lockA) { synchronized(lockB) { ... } }",
      "explanation": "Lock A acquired before lock B in this path."
    },
    {
      "startLine": 78,
      "endLine": 85,
      "code": "synchronized(lockB) { synchronized(lockA) { ... } }",
      "explanation": "Lock B acquired before lock A in another path, creating a cycle."
    }
  ],
  "executionPath": ["method1", "method2"],
  "triggerConditions": ["Both methods are called concurrently"],
  "consequence": "Threads may deadlock indefinitely, causing application hang.",
  "technicalExplanation": "The code acquires locks in different orders in different methods, creating a circular wait condition that can lead to deadlock under concurrent execution.",
  "remediation": "Refactor the code to acquire locks in a consistent order (e.g., always acquire lockA before lockB). Consider using tryLock with timeout to avoid indefinite blocking.",
  "relatedSymbols": ["lockA", "lockB"],
  "testToReproduce": null
}

==================== EXECUTION OVERVIEW (MANDATORY - COMPLETE ALL FIELDS) ====================

You MUST fill ALL fields of executionOverview:

- entryPoints: Array of method names where execution begins (e.g., ["build", "run", "main"]).
- taskSubmissionPoints: Array of methods/locations where tasks are submitted (e.g., ["executor.submit", "executor.execute", "thread.start"]).
- blockingWaitPoints: Array of methods/locations where the code blocks waiting for results (e.g., ["future.get", "semaphore.tryAcquire", "Thread.join", "CountDownLatch.await"]).
- sharedResources: Array of resources that are shared across threads (e.g., ["poolMap", "semaphoreMap", "sharedQueue"]).
- resourceLifecycle: Array of lifecycle events (e.g., ["created in bulkhead", "released in finally", "acquired in tryAcquire"]).

🔥 **DO NOT leave these fields empty.** If a category is not applicable, provide a brief explanation (e.g., "No task submission points identified").

==================== ARCHITECTURAL OBSERVATIONS (MANDATORY) ====================

You MUST identify architectural patterns in the code. For each pattern found, provide:
- title: Name of the pattern (e.g., "Bulkhead Pattern Implementation")
- explanation: How it is implemented in the code
- relatedFindingIds: IDs of findings related to this pattern

If no architectural patterns are found, output an empty array.

==================== RECOMMENDED ACTIONS (MANDATORY) ====================

For each finding with severity "critical" or "high", you MUST provide a recommended action.
For "medium" findings, you SHOULD provide one.

Each action:
- priority: number from 1 (highest) to 10
- severity: same as the finding
- title: short title
- action: specific, actionable step
- relatedFindingIds: array of finding IDs

If no findings exist, output an empty array.

==================== SUGGESTED TESTS (MANDATORY) ====================

For each finding with severity "critical" or "high", you MUST provide a suggested test.
For "medium" findings, you SHOULD provide one.

Each test:
- title: short title
- purpose: why this test is needed
- setup: array of setup steps
- steps: array of test steps (at least 1)
- expectedResult: what should happen
- relatedFindingIds: array of finding IDs

If no findings exist, output an empty array.

==================== EXECUTION-PATH SIMULATION ====================

Before accepting a finding, simulate the path:
S0: initial state
S1: first mutation/submission
S2: subsequent mutation/wait
S3: scheduler interleaving
S4: resulting state
S5: observable consequence

Track task identity, executor identity, queue, etc.

==================== PROOF GATES ====================

- Thread-starvation: require explicit saturation path.
- Deadlock: require complete wait-for cycle (or strong evidence of one).
- Duplicate submission: require two distinct successful paths.
- Interruption: do not report merely because InterruptedException is caught.

==================== COUNTERARGUMENT GATE ====================

Before accepting a finding, consider if the code could be correct under some circumstances.
If a counterargument is strong, reduce confidence or reject the finding.

==================== SCORECARD (0-100 OBJECT WITH APPLICABLE FLAG) ====================

Same as generic audit. Each category:
{
  "applicable": boolean,
  "score": number | null,
  "reason": string,
  "relatedFindings": []
}

Categories: correctness, concurrencySafety, liveness, errorHandling, resourceManagement, maintainability, productionReadiness

**Rules:**
- Score each applicable category independently.
- If a category cannot be evaluated, set applicable: false.

==================== VERDICT (6 STATUSES) ====================

Same as generic audit:
- not-production-ready
- requires-major-changes
- requires-changes
- requires-minor-changes
- approved-with-suggestions
- approved

**Rules:**
- Critical findings → not approved or requires-minor-changes.
- High findings → typically requires-major-changes or requires-changes.

==================== IMPROVED CODE ====================

{
  "available": true, "code": "...", "notes": "..."
}
or
{
  "available": false, "code": null, "notes": "..."
}

Only provide code if you can confidently fix the issues.

==================== COMPLEXITY ====================

{
  "applicable": true, "expression": "O(n)", "explanation": "...", "variables": [], "assumptions": []
}
or
{
  "applicable": false, "expression": null, "explanation": null, "variables": [], "assumptions": []
}

==================== LINKEDIN POST ====================

- Max 300 characters, min 1 character.
- Derived from actual findings.
- No fabricated metrics.

==================== MANDATORY FIELDS ====================

All fields are mandatory.
Arrays must be present (use [] when empty).
Strings must be non-empty.
Do not use placeholder text like "Untitled Finding" or "No ... provided".

==================== FINAL REMINDER (DO NOT IGNORE) ====================

🔥 You MUST produce at least 2 findings for non-trivial code.
🔥 Each finding MUST have a descriptive title, detailed technical explanation, and actionable remediation.
🔥 Each finding MUST have at least ONE evidence item with startLine, endLine, code, and explanation.
🔥 executionOverview MUST have ALL fields filled (entryPoints, taskSubmissionPoints, blockingWaitPoints, sharedResources, resourceLifecycle).
🔥 If a deadlock is detected, create a separate finding with severity "critical" and mechanism ["deadlock"].
🔥 NEVER use placeholder text. Generate all content from the actual source code.

==================== OUTPUT ====================

Return exactly one valid JSON object. Do not wrap it in Markdown fences.
Do not output any text before or after the JSON object.

Base all findings, scores, remediations, and conclusions on the supplied source code.
Be constructive, clear, and specific.
Make every recommendation actionable.
`;
}