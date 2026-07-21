// lib/analysis/repair.ts

import { callOpenAI } from '@/lib/openaiClient';
import { buildRepairPrompt } from './prompts/repair';
import type { AdvancedAuditResult, AuditValidationResult } from './types';
import { defaultDependencies, type AnalysisDependencies } from './dependencies';
import logger from '@/lib/logger';

function extractJSON(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return text;
  return text.substring(start, end + 1).replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

export async function repairAudit(
  numberedCode: string,
  previousAudit: string,
  validationResult: AuditValidationResult,
  language: string,
  auditType: 'generic' | 'concurrency',
  deps: AnalysisDependencies = defaultDependencies
): Promise<AdvancedAuditResult | null> {
  const missingCoverage: string[] = [];

  for (const issue of validationResult.issues) {
    if (issue.expectedCoverage && !missingCoverage.includes(issue.expectedCoverage)) {
      missingCoverage.push(issue.expectedCoverage);
    }
  }

  const prompt = buildRepairPrompt(
    numberedCode,
    previousAudit,
    validationResult.issues,
    missingCoverage
  );

  try {
    const systemPrompt = 'You are an expert code auditor. Return only valid JSON.';

    const content = await deps.callAI(systemPrompt, prompt, {
      mode: 'advanced',
      responseFormat: 'text',
    });

    const extracted = extractJSON(content);
    const repaired = JSON.parse(extracted) as AdvancedAuditResult;

    return {
      ...repaired,
      schemaVersion: '1.0',
      status: 'repaired',
    };
  } catch (error) {
    deps.logger.error('[Repair] Repair failed:', error);
    return null;
  }
}