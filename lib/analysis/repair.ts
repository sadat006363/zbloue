// lib/analysis/repair.ts

import OpenAI from 'openai';
import { buildRepairPrompt } from './prompts/repair';
import { AdvancedAuditResult, AuditValidationResult, ValidationIssue } from './types';
import { AdvancedAuditResultSchema } from './schema';
import { ANALYSIS_CONFIG } from './config';

const openaiApiKey = process.env.OPENAI_API_KEY || 'placeholder-key';
const openai = new OpenAI({ apiKey: openaiApiKey });

export async function repairAudit(
  numberedCode: string,
  previousAudit: AdvancedAuditResult | null,
  validationResult: AuditValidationResult,
  language: string,
  auditType: 'generic' | 'concurrency'
): Promise<AdvancedAuditResult | null> {
  const missingCoverage: string[] = [];

  for (const issue of validationResult.issues) {
    if (issue.expectedCoverage && !missingCoverage.includes(issue.expectedCoverage)) {
      missingCoverage.push(issue.expectedCoverage);
    }
  }

  if (missingCoverage.length === 0 && validationResult.structurallyValid) {
    return previousAudit;
  }

  const previousAuditJson = previousAudit ? JSON.stringify(previousAudit, null, 2) : '{}';

  const prompt = buildRepairPrompt(
    numberedCode,
    previousAuditJson,
    validationResult.issues,
    missingCoverage
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await openai.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL_ADVANCED || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert code auditor. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
        max_tokens: 16000,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const content = response.choices[0].message.content || '{}';
    const repaired = JSON.parse(content);

    // Validate repaired result
    const parsed = AdvancedAuditResultSchema.parse(repaired);
    return parsed as AdvancedAuditResult;
  } catch (error) {
    console.error('Repair failed:', error);
    return null;
  }
}