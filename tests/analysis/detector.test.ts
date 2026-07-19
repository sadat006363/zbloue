// tests/analysis/detector.test.ts

import { detectConcurrencySignals } from '@/lib/analysis/detector';
import { describe, it, expect } from '@jest/globals';

describe('Concurrency Signal Detector', () => {
  it('should detect executor signals in Java code', () => {
    const code = `
public class Test {
  private ExecutorService executor = Executors.newFixedThreadPool(2);
  public void run() {
    Future<Integer> future = executor.submit(() -> 42);
    Integer result = future.get();
  }
}
`;
    const result = detectConcurrencySignals(code, 'java');
    expect(result.requiresConcurrencyAudit).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.signals.some(s => s.type === 'EXECUTOR')).toBe(true);
    expect(result.signals.some(s => s.type === 'FUTURE_GET')).toBe(true);
  });

  it('should NOT trigger for simple non-concurrent code', () => {
    const code = `
function add(a, b) {
  return a + b;
}
`;
    const result = detectConcurrencySignals(code, 'javascript');
    expect(result.requiresConcurrencyAudit).toBe(false);
    expect(result.signals.length).toBe(0);
  });
});