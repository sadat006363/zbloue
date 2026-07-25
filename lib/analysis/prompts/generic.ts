// lib/analysis/prompts/generic.ts

import { getBaseSystemInstructions } from './base';
import {
  buildSafePromptPayload,
  buildUntrustedDataSection,
  type PromptContext,
} from '../prompt-context';

/**
 * ساخت پرامپت عمومی برای تحلیل کد
 */
export function buildGenericAdvancedPrompt(context: PromptContext): string {
  const { serializedCode, serializedSourceLanguage, serializedResponseLanguage } =
    buildSafePromptPayload(context);

  return `
${getBaseSystemInstructions()}

==================== GENERIC ADVANCED CODE AUDIT ====================

You are a senior software engineer and production-safety auditor.
Your primary goal is to discover correctness, security, performance, and maintainability defects.
Do not produce a generic code review.
Do not prioritize naming, formatting, or style over behavioral defects.

**CONCURRENCY ESCALATION:**
If the source contains ANY of the following, apply the concurrency-specific analysis
rules (execution simulation, saturation analysis, wait-for graph, ownership tracking):
- Executors, thread pools, or async executors
- Futures, promises, or completion stages
- Threads, locks, semaphores, or synchronized blocks
- Blocking queues or concurrent collections
- Async/await, promise chains, or callback-based async patterns
- join(), get(), await(), or other blocking waits
- Any shared mutable state accessed from multiple contexts

==================== SOURCE CODE (JSON-ENCODED, UNTRUSTED) ====================

${buildUntrustedDataSection('source-code-json', serializedCode)}

==================== CONTEXT ====================

Source programming language: ${serializedSourceLanguage}
Response language: ${serializedResponseLanguage}

All explanatory text and human-readable fields must be written in ${context.responseLanguage}.
Keep identifiers, code, enum values, IDs, and schema keys unchanged.

==================== CANONICAL OUTPUT CONTRACT ====================

You must return a JSON object with the following structure. **All fields are mandatory and must contain meaningful values.**

{
  "schemaVersion": "1.0",
  "auditType": "comprehensive",
  "appliedSpecializations": [],
  "completionStatus": "complete",
  "repairApplied": false,
  "title": "Descriptive audit title",
  "language": "${context.sourceLanguage}",
  "responseLanguage": "${context.responseLanguage}",
  "analysisCoverage": [
    { "dimension": "correctness", "status": "analyzed", "summary": "Analysis of correctness dimension.", "limitation": null },
    { "dimension": "security", "status": "analyzed", "summary": "Analysis of security dimension.", "limitation": null },
    { "dimension": "concurrency", "status": "analyzed", "summary": "Analysis of concurrency dimension.", "limitation": null },
    { "dimension": "liveness", "status": "analyzed", "summary": "Analysis of liveness dimension.", "limitation": null },
    { "dimension": "performance", "status": "analyzed", "summary": "Analysis of performance dimension.", "limitation": null },
    { "dimension": "resource-management", "status": "analyzed", "summary": "Analysis of resource management dimension.", "limitation": null },
    { "dimension": "error-handling", "status": "analyzed", "summary": "Analysis of error handling dimension.", "limitation": null },
    { "dimension": "input-validation", "status": "analyzed", "summary": "Analysis of input validation dimension.", "limitation": null },
    { "dimension": "data-integrity", "status": "analyzed", "summary": "Analysis of data integrity dimension.", "limitation": null },
    { "dimension": "api-design", "status": "analyzed", "summary": "Analysis of API design dimension.", "limitation": null },
    { "dimension": "architecture", "status": "analyzed", "summary": "Analysis of architecture dimension.", "limitation": null },
    { "dimension": "maintainability", "status": "analyzed", "summary": "Analysis of maintainability dimension.", "limitation": null },
    { "dimension": "testability", "status": "analyzed", "summary": "Analysis of testability dimension.", "limitation": null },
    { "dimension": "observability", "status": "analyzed", "summary": "Analysis of observability dimension.", "limitation": null },
    { "dimension": "compatibility", "status": "analyzed", "summary": "Analysis of compatibility dimension.", "limitation": null }
  ],
  "summary": "Concise summary of findings and code quality.",
  "executionOverview": {
    "entryPoints": ["method1", "method2"],
    "taskSubmissionPoints": ["executor.submit", "executor.execute"],
    "blockingWaitPoints": ["future.get", "semaphore.tryAcquire"],
    "sharedResources": ["poolMap", "semaphoreMap"],
    "resourceLifecycle": ["created in bulkhead", "released in finally"]
  },
  "findings": [
    {
      "id": "F-001",
      "title": "Semaphore leak on exception path",
      "category": "resource-management",
      "mechanisms": ["resource-leak"],
      "severity": "high",
      "confidence": "definite",
      "evidence": [
        {
          "startLine": 120,
          "endLine": 130,
          "code": "if (!semaphore.tryAcquire(...)) throw ...",
          "explanation": "Semaphore acquired but not released on exception path."
        }
      ],
      "executionPath": ["submitWithBulkhead", "tryAcquire", "exception"],
      "triggerConditions": ["Exception occurs after acquire"],
      "consequence": "Permit leak, eventual thread starvation",
      "technicalExplanation": "Semaphore permit is not released if an exception occurs after acquisition.",
      "remediation": "Move semaphore.release() to a finally block.",
      "relatedSymbols": ["semaphore", "tryAcquire"],
      "testToReproduce": null
    }
  ],
  "architecturalObservations": [
    {
      "title": "Bulkhead Pattern Implementation",
      "explanation": "The code implements a bulkhead pattern using Semaphore and ThreadPoolExecutor to limit concurrent access.",
      "relatedFindingIds": ["F-001"]
    },
    {
      "title": "Retry Pattern Implementation",
      "explanation": "The code implements a retry pattern with while loop and retryCount.",
      "relatedFindingIds": ["F-002"]
    }
  ],
  "recommendedActions": [
    {
      "priority": 1,
      "severity": "high",
      "title": "Fix Semaphore Release on Exception",
      "action": "Ensure semaphore is released in all code paths, including exceptions.",
      "relatedFindingIds": ["F-001"]
    }
  ],
  "suggestedTests": [
    {
      "title": "Test Bulkhead Rejection",
      "purpose": "Verify that the bulkhead rejects tasks when the queue is full.",
      "setup": ["Create a pool with maxConcurrentThreads=1, maxQueueSize=1"],
      "steps": ["Submit 3 tasks concurrently", "Wait for rejection"],
      "expectedResult": "Third task throws BulkheadRejectedExecutionException",
      "relatedFindingIds": ["F-001"]
    }
  ],
  "complexity": {
    "applicable": true,
    "expression": "O(1)",
    "explanation": "Constant time complexity.",
    "variables": [{ "symbol": "n", "definition": "size of input" }],
    "assumptions": ["Input size is bounded."]
  },
  "scorecard": {
    "correctness": { "applicable": true, "score": 85, "reason": "Good", "relatedFindings": [] },
    "concurrencySafety": { "applicable": false, "score": null, "reason": "No concurrency primitives", "relatedFindings": [] },
    "liveness": { "applicable": false, "score": null, "reason": "No liveness issues", "relatedFindings": [] },
    "errorHandling": { "applicable": true, "score": 70, "reason": "Basic error handling", "relatedFindings": [] },
    "resourceManagement": { "applicable": true, "score": 80, "reason": "Resources managed", "relatedFindings": [] },
    "maintainability": { "applicable": true, "score": 85, "reason": "Simple and readable", "relatedFindings": [] },
    "productionReadiness": { "applicable": true, "score": 75, "reason": "Ready for production", "relatedFindings": [] }
  },
  "verdict": {
    "status": "approved-with-suggestions",
    "explanation": "Justification based on findings and scorecard."
  },
  "limitations": ["Analysis based solely on supplied source code."],
  "improvedCode": {
    "available": true,
    "code": "public class Try<T> { ... }",
    "notes": "Improved version with proper semaphore release."
  },
  "linkedin_post": "Professional summary, max 300 characters."
}

==================== REQUIRED ANALYSIS DIMENSIONS ====================

1. CORRECTNESS & LOGICAL FLAWS
2. SECURITY (if applicable)
3. PERFORMANCE & SCALABILITY
4. RESOURCE MANAGEMENT & LIFECYCLE
5. PRODUCTION READINESS

==================== FINDINGS GENERATION (CRITICAL - HIGHEST PRIORITY) ====================

🔥 THIS IS THE MOST IMPORTANT SECTION. FOLLOW IT EXACTLY.

You MUST generate findings that are:
- At least 2 findings for non-trivial code (like the one you are analyzing).
- At least 1 finding for trivial code.

Each finding MUST include:

- id: Sequential starting from F-001, F-002, ...
- title: A concise, descriptive title (max 10 words). Example: "Semaphore Leak on Exception", "Potential Thread Starvation". NEVER use "Untitled Finding".
- category: One of: correctness, concurrency, security, reliability, error-handling, resource-management, performance, data-integrity, input-validation, api-design, configuration, architecture, maintainability, testability, observability, compatibility, other.
- mechanisms: Array of applicable mechanisms (e.g., ["resource-leak", "deadlock", "thread-starvation"]). Use [] if none.
- severity: critical, high, medium, low, or info.
- confidence: definite, likely, or conditional.
- evidence: 🔥 MUST contain at least ONE object with startLine, endLine (exact line numbers from the numbered source), code (exact excerpt), and explanation. If you cannot find exact line numbers, use reasonable estimates based on the code structure.
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

==================== STARVATION DEADLOCK / SELF-DEADLOCK DETECTION (CRITICAL - NEW) ====================

🔥 **STARVATION DEADLOCK / SELF-DEADLOCK DETECTION:**

This is a critical concurrency issue that occurs when a task running in a thread pool submits another task to the SAME thread pool and then waits for its completion (e.g., Future.get()).

**When to report:**
- You see a task (e.g., in createTask()) that uses executor.submit() to submit another task to the SAME executor.
- The outer task then calls future.get() (or similar blocking wait) and waits for the inner task to complete.
- If the thread pool is bounded (fixed size) and all threads are busy with outer tasks, the inner tasks will wait indefinitely → STARVATION DEADLOCK.

**Example pattern:**
**Severity:**
- If maxConcurrentThreads = 1 → **critical** (certain deadlock)
- If maxConcurrentThreads > 1 → **high** (risk under load when all threads are busy with outer tasks)

**Finding specifications:**
- title: "Thread Starvation Deadlock in Same-Executor Submission" (or similar)
- severity: "critical" (if maxConcurrentThreads = 1) or "high"
- confidence: "definite" (if proven by code) or "likely"
- mechanisms: ["deadlock", "thread-starvation"]
- category: "concurrency"
- remediation: "Refactor to use a separate executor for timeout, or avoid submitting inner tasks to the same pool. Consider using a dedicated timeout mechanism outside the executor."

**If you find this pattern, create a separate finding with the above specifications.**

==================== DUPLICATE SUBMISSION DETECTION (HIGH PRIORITY - NEW) ====================

🔥 **DUPLICATE SUBMISSION DETECTION - MUST BE REPORTED AS SEPARATE FINDING:**

This occurs when the same task (Runnable/FutureTask) is submitted to the executor more than once, causing queue pollution and unpredictable behavior.

**When to report:**
- You see a task being added to the queue via executor.getQueue().offer(...) and then also submitted via executor.execute(...).
- Or you see a task submitted twice through any combination of methods (e.g., submit() called twice on the same task, or execute() called after offer()).

**Example pattern:**
**Severity:** high (can cause queue capacity exhaustion and rejection errors)

**Finding specifications (MUST USE THESE):**
- **id**: Sequential (e.g., F-003)
- **title**: "Duplicate Task Submission to Executor" (or similar)
- **severity**: "high"
- **confidence**: "definite"
- **mechanisms**: ["queue-misuse"]
- **category**: "concurrency"
- **remediation**: "Use only one submission method. Either use executor.execute() directly, or manage the queue manually with offer() and then submit via the executor's internal mechanism (but not both)."

🔥 **YOU MUST CREATE A SEPARATE FINDING FOR DUPLICATE SUBMISSION.** Do NOT merge it with other findings.

==================== CODE SMELL / DUPLICATE LOGIC DETECTION (NEW) ====================

🔥 **CODE SMELL / DUPLICATE LOGIC DETECTION - MUST BE REPORTED AS SEPARATE FINDING:**

Detect patterns where logic is repeated, inconsistent, or poorly structured.

**When to report:**
- Multiple map.get() calls on the same key without storing the result in a local variable (repeated lookups).
- The same logic (e.g., pool creation/retrieval) is spread across multiple methods (scattered logic).
- Configuration fields (e.g., maxWaitMillis, maxConcurrentThreads) are not updated consistently across overloaded methods.
- Inconsistent design patterns (e.g., using AbortPolicy + manual offer on the same queue).

**Example patterns:**
**Severity:** medium (reduces maintainability)

**Finding specifications (MUST USE THESE):**
- **id**: Sequential (e.g., F-004)
- **title**: "Repeated Map Lookups / Scattered Configuration Logic" (or similar)
- **severity**: "medium"
- **confidence**: "definite"
- **category**: "maintainability"
- **remediation**: "Store the result of poolMap.get() and semaphoreMap.get() in local variables before checking conditions. Centralize pool creation/retrieval logic in a helper method."

🔥 **YOU MUST CREATE A SEPARATE FINDING FOR CODE SMELL.** Do NOT merge it with other findings.

==================== INCONSISTENT DESIGN DETECTION (NEW) ====================

🔥 **INCONSISTENT DESIGN DETECTION:**

Detect when the code uses conflicting patterns that make behavior unpredictable.

**When to report:**
- Using ThreadPoolExecutor.AbortPolicy (or any rejection policy) while manually managing the queue with offer().
- This creates inconsistency because the executor's rejection policy is bypassed by manual queue management.

**Example pattern:**
**Severity:** medium (may cause unexpected rejection behavior and confusion)

**Finding specifications:**
- title: "Inconsistent Queue Management with AbortPolicy" (or similar)
- severity: "medium"
- confidence: "definite"
- category: "configuration"
- remediation: "Either rely entirely on the executor's internal queue management (remove manual offer()) or use a custom RejectedExecutionHandler if manual control is needed. Do not mix both approaches."

**If you find this pattern, create a separate finding with the above specifications.**

==================== DEADLOCK DETECTION (LOCK-BASED - EXISTING) ====================

🔥 **LOCK-BASED DEADLOCK DETECTION:**

If you detect a potential deadlock due to lock ordering (synchronized, ReentrantLock, etc.), create a finding with severity "critical" and mechanisms ["deadlock"].

**When to report:**
- Two or more threads/tasks acquiring locks in different orders.
- A thread holding a lock while waiting for another resource that is held by a thread waiting for the first lock.

**Finding specifications:**
- severity: "critical"
- confidence: "definite" or "likely"
- title: "Potential Deadlock Detected" (or more specific)
- category: "concurrency"
- mechanisms: ["deadlock"]

**If you find this pattern, create a separate finding with the above specifications.**

==================== EXECUTION OVERVIEW (MANDATORY - COMPLETE ALL FIELDS) ====================

You MUST fill ALL fields of executionOverview:

- entryPoints: Array of method names where execution begins (e.g., ["main", "build", "run"]).
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

==================== EVIDENCE REQUIREMENTS ====================

- Every finding must have at least one evidence object.
- Evidence code must be an exact excerpt from the provided source (no ellipses).
- Line numbers must be valid (1-indexed) based on the numbered source code.
- Do not invent code or line numbers.

==================== CONFIDENCE CALIBRATION ====================

- definite: The defect follows directly from the submitted code.
- likely: A realistic path exists but depends on runtime factors.
- conditional: The defect requires explicitly stated external conditions.

==================== COUNTERARGUMENT GATE ====================

Before accepting a finding, consider if the code could be correct under some circumstances.
If a counterargument is strong, reduce confidence or reject the finding.

==================== SCORECARD (0-100 OBJECT WITH APPLICABLE FLAG) ====================

Each category is an object with:
- applicable: boolean (true if evaluated)
- score: number (0-100) or null if not applicable
- reason: string
- relatedFindings: array of finding IDs

Categories: correctness, concurrencySafety, liveness, errorHandling, resourceManagement, maintainability, productionReadiness

**Rules:**
- Score each applicable category independently.
- If a category cannot be evaluated, set applicable: false and score: null.

==================== VERDICT (6 STATUSES) ====================

- not-production-ready
- requires-major-changes
- requires-changes
- requires-minor-changes
- approved-with-suggestions
- approved

**Rules:**
- Critical findings → cannot be approved or requires-minor-changes.
- High findings → typically requires-major-changes or requires-changes.

==================== IMPROVED CODE (DISCRIMINATED UNION) ====================

{
  "available": true,
  "code": "...",
  "notes": "..."
}
or
{
  "available": false,
  "code": null,
  "notes": "..."
}

Only provide code if you can confidently fix the issues.

==================== COMPLEXITY (DISCRIMINATED UNION) ====================

{
  "applicable": true,
  "expression": "O(n)",
  "explanation": "...",
  "variables": [{ "symbol": "n", "definition": "..." }],
  "assumptions": ["..."]
}
or
{
  "applicable": false,
  "expression": null,
  "explanation": null,
  "variables": [],
  "assumptions": []
}

==================== LINKEDIN POST ====================

- Max 300 characters, min 1 character.
- Derived from actual findings.
- No fabricated metrics.

==================== MANDATORY FIELDS ====================

All fields in the output contract are mandatory.
Arrays must be present (use [] when empty).
Strings must be non-empty.
Do not use placeholder text like "Untitled Finding" or "No ... provided".

==================== FINAL REMINDER (DO NOT IGNORE) ====================

🔥 You MUST produce at least 2 findings for non-trivial code.
🔥 Each finding MUST have a descriptive title, detailed technical explanation, and actionable remediation.
🔥 Each finding MUST have at least ONE evidence item with startLine, endLine, code, and explanation.
🔥 executionOverview MUST have ALL fields filled (entryPoints, taskSubmissionPoints, blockingWaitPoints, sharedResources, resourceLifecycle).
🔥 **CRITICAL: Check for Starvation Deadlock (same-executor submit + wait).**
🔥 **CRITICAL: Check for Duplicate Submission (offer + execute) and create a SEPARATE finding for it.**
🔥 **CRITICAL: Check for Code Smells (repeated lookups, scattered logic) and create a SEPARATE finding for it.**
🔥 If a lock-based deadlock is detected, create a separate finding with severity "critical" and mechanism ["deadlock"].
🔥 NEVER use placeholder text. Generate all content from the actual source code.

==================== OUTPUT ====================

Return exactly one valid JSON object. Do not wrap it in Markdown fences.
Do not output any text before or after the JSON object.

Base all findings, scores, remediations, and conclusions on the supplied source code.
Be constructive, clear, and specific.
Make every recommendation actionable.
`;
}