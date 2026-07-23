// lib/analysis/prompts/concurrency.ts

import { getBaseSystemInstructions } from './base';
import {
  buildSafePromptPayload,
  buildUntrustedDataSection,
  type PromptContext,
} from '../prompt-context';

/**
 * ساخت پرامپت تخصصی برای تحلیل همروندی
 * 
 * @param context - تنظیمات پرامپت شامل کد، زبان‌ها و ...
 * @returns پرامپت کامل برای ارسال به مدل
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

2. ANALYZE RESOURCE OWNERSHIP:
   - Analyze construction sites, reference holders, lifecycle owners, ownership transfers.
   - Claim lifecycle ownership only when positive visible evidence establishes it.
   - If ownership is ambiguous, record a limitation rather than a definite defect.

3. ANALYZE SAFETY:
   - Race conditions: two concurrent paths accessing shared mutable state.
   - Unsafe publication: object made visible without proper happens-before ordering.
   - Check-then-act bugs: two non-atomic operations on shared state.
   - Duplicate task submission: two submission paths for same task.
   - Permit leaks/over-release: acquire/release imbalance.

4. ANALYZE LIVENESS:
   - Deadlock: cyclic dependency between resources/threads.
   - Thread-starvation: bounded executor + nested submission + blocking wait + saturation.
   - Livelock: threads actively changing state but making no progress.
   - Starvation: threads denied access to resources indefinitely.

==================== EXECUTION-PATH SIMULATION ====================

Before accepting any finding, simulate each relevant path as ordered state transitions:

S0: initial resource, queue, lock, permit, and task state
S1: first mutation/submission/acquisition
S2: subsequent mutation/submission/wait
S3: scheduler or concurrent interleaving
S4: resulting state
S5: observable consequence

For task-based code, track:
- task identity
- executor identity
- queue identity
- submission count
- worker occupancy
- blocking dependency
- completion ownership
- cancellation and timeout paths

Do not infer a defect from isolated API calls. Demonstrate the state transition that violates an invariant.

==================== PROOF GATE: THREAD-STARVATION ====================

A thread-starvation finding requires an explicit saturation path:

1. Identify the executor E and its effective worker capacity W.
2. Identify a parent task P that can execute on E.
3. Show that P submits or causes submission of child task C to E.
4. Show that P blocks waiting for C or for a result that depends on C.
5. Determine whether at least W parent tasks can simultaneously occupy all workers of E.
6. Determine whether queued child tasks require workers from E to make progress.
7. Check escape mechanisms:
   - timeout that actually exits the wait
   - caller-runs or inline execution
   - work-stealing or managed blocking compensation
   - cancellation that releases the dependency
   - rejection before the parent begins waiting
   - execution on a distinct executor

**Classification:**
- definite: the complete saturation and wait path is visible
- likely: the path is strongly supported but one runtime factor is external
- conditional: the hazard requires explicitly named external conditions
- do not report: nested submission exists but no blocking dependency or saturation path

**Confidence levels:**
- definite: All conditions are visible in the supplied source.
- likely: One condition depends on reasonable external assumption.
- conditional: The hazard requires explicitly stated conditions (pool size, caller context, etc.).

==================== PROOF GATE: GENERIC DEADLOCK ====================

Before reporting a generic deadlock as definite, establish:
- Participants: At least two visible participants (threads, tasks).
- Resources: Specific resources under each participant's control.
- Wait relationship: What each participant is waiting for.
- Complete wait-for cycle: Directed closed cycle in the wait-for graph.
- Reachability: Evidence paths can overlap in execution.
- No escape path: No timeout, cancellation, or compensation can break the cycle.

**Lock-order inversion reporting:**
- If two lock acquisition orders are visible but concurrency is not proven:
  → report as conditional with explicitly stated trigger conditions
- Include: exact lock names, acquisition order in each path, trigger conditions, and runtime assumptions.

**Classification:**
- definite: Complete cycle visible, no escape path.
- likely: Cycle strongly implied, one runtime factor external.
- conditional: Opposing lock orders visible, concurrency depends on external conditions.

==================== PROOF GATE: DUPLICATE SUBMISSION ====================

Report definite duplicate submission only when:
1. The same logical task identity is visible.
2. Two distinct successful scheduling paths can be reached for one invocation.
3. The paths are not mutually exclusive.
4. No deduplication or removal step exists between them.
5. The task can consequently execute more than once or consume duplicate queue capacity.

If queue identity, task identity, or success of one path depends on external configuration:
→ use likely or conditional confidence and state the exact condition.

==================== PROOF GATE: INTERRUPTION ====================

Do not report interruption handling as defective merely because InterruptedException is caught.

**Interruption is considered preserved when the code:**
- rethrows InterruptedException
- restores the flag using Thread.currentThread().interrupt()
- or translates interruption according to a visible API contract while preserving cancellation semantics

**Potential defects (report only with evidence):**
- swallowing InterruptedException without restoring or rethrowing it
- continuing a blocking/retry loop after interruption without justification
- clearing the interrupt flag and losing cancellation intent
- converting interruption into an unrelated success result
- releasing or mutating resources incorrectly on the interrupted path

Restoring the interrupt flag is not itself a defect.
If the surrounding API contract is unavailable, record contract uncertainty as a limitation.

==================== COUNTERARGUMENT GATE ====================

Before accepting each candidate finding:

1. State the candidate invariant violation internally.
2. Construct the strongest source-supported explanation under which the code is correct.
3. Search the supplied source for:
   - guards, finally blocks, idempotency, deduplication
   - timeout exits, cancellation, alternate executors
   - caller-runs behavior, compensation workers
   - ownership transfer, interrupt restoration, cleanup by lifecycle owner
4. Reject the finding if the counterargument is established by visible code.
5. Reduce confidence if the counterargument depends on missing external context.
6. Include a concise confidence justification.

==================== SEMAPHORE ANALYSIS ====================

**Safe patterns:**
- blocking acquire() with matching release() in finally
- tryAcquire() with boolean check before release

**Unsafe patterns (report only when proven):**
- successful acquire without release on all exit paths
- over-release on false acquire
- acquire/release separated across methods without guarantee

Do NOT recommend try-with-resources for Semaphore unless codebase already has an AutoCloseable guard.

==================== QUEUE FINDINGS ====================

Queue operation alone is not a defect. Need:
- demonstrated invariant violation
- reachable causal chain
- concrete runtime consequence

Do not report queue presence alone as a finding.

==================== SCORECARD (0-100 OBJECT) ====================

All scores MUST be integers between 0 and 100. DO NOT use a 0–10 scale.

Each category is an object:
{
  "score": number,      // 0-100
  "reason": string,     // evidence-based justification
  "relatedFindings": [] // array of finding IDs
}

Categories:
- correctness
- concurrencySafety
- liveness
- errorHandling
- resourceManagement
- maintainability
- productionReadiness

**Rules:**
- Score every category independently based on evidence relevant to that category.
- Do NOT lower unrelated categories because one severe finding exists.
- Concurrency safety and liveness must not be penalized when no concurrency mechanism is present.
- Do NOT assign 100 solely because findings array is empty.
- Scores below 20 are reserved for catastrophic failure with direct evidence.

==================== VERDICT (6 STATUSES) ====================

Use one of these verdict statuses:
- not-production-ready
- requires-major-changes
- requires-changes
- requires-minor-changes
- approved-with-suggestions
- approved

**Rules:**
- Critical findings cannot result in approved, approved-with-suggestions, or requires-minor-changes.
- High severity findings normally require major changes.
- Multiple interacting medium findings may justify a stronger verdict.
- Explain the verdict with reference to findings, remediation scope, and production risk.

==================== IMPROVED CODE ====================

{
  "available": boolean,  // true only if safe patch can be created from context
  "code": string | null, // non-empty if available === true, null otherwise
  "notes": string        // explanation of changes and tradeoffs
}

**Rules:**
- Do NOT invent missing APIs, types, imports, configuration, or dependencies.
- Prefer minimal, targeted fixes over broad rewrites.
- Preserve public APIs and intended behavior where possible.
- If safe fix depends on missing context, set available to false.

==================== LINKEDIN POST ====================

- Max 300 characters, min 1 character.
- Must be derived from actual findings.
- If no findings, do not imply a bug was discovered.
- If findings are low-confidence, use phrasing like "reviewed potential concurrency risks".
- Do not include fabricated metrics or expose sensitive source content.

==================== MANDATORY FIELDS ====================

The following fields are MANDATORY:
- schemaVersion
- auditType
- status
- language
- summary
- executionOverview
- findings
- architecturalObservations
- recommendedActions
- suggestedTests
- complexity
- scorecard
- verdict
- limitations
- improvedCode
- linkedin_post

All string fields must be non-empty. Arrays must be present (use [] when empty).

==================== OUTPUT ====================

Return exactly one valid JSON object. Do not wrap it in Markdown fences.
Do not output any text before or after the JSON object.

Base all findings, scores, remediations, and conclusions on the supplied source code.
Do not copy placeholder values.
Do not invent code, dependencies, configuration, or runtime behavior.
Be constructive, clear, and specific.
Make every recommendation actionable.
`;
}