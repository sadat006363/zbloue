// lib/analysis/config.ts

export const ANALYSIS_CONFIG = {
  concurrencyThreshold: 5,
  maxLinesForAnalysis: 500,
  maxRepairPasses: 1,
  schemaVersion: '1.0',
  scoreRange: { min: 0, max: 10 },
};

export const SIGNAL_WEIGHTS: Record<string, number> = {
  EXECUTOR: 3,
  THREAD_POOL: 3,
  FUTURE_GET: 3,
  NESTED_SUBMISSION: 4,
  SEMAPHORE: 3,
  LOCK: 3,
  BLOCKING_QUEUE: 3,
  SYNCHRONIZED: 2,
  VOLATILE: 2,
  PARALLEL_STREAM: 2,
  COMPLETABLE_FUTURE: 2,
  COUNT_DOWN_LATCH: 3,
  CYCLIC_BARRIER: 3,
  ASYNC_AWAIT: 2,
  PROMISE: 2,
  WORKER_THREAD: 3,
  MUTEX: 3,
};