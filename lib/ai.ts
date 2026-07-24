// lib/ai.ts

import { callOpenAI, callOpenAIJson } from './openaiClient';
import logger from './logger';
import type { LegacyGenerateResponse } from '@/types';
import { getBaseSystemInstructions } from './analysis/prompts/base';

// ============================================================
// 1. Prompt builders for each mode
// ============================================================

function buildSimplePrompt(code: string, language: string): string {
  return `
${getBaseSystemInstructions()}

You are a friendly programming mentor. Provide a simple, high-level explanation of the following code.
Focus on:
- What the code does overall.
- Key concepts.
- Any obvious issues or improvements.

Code (${language}):
${code}

Return your analysis as plain text (not JSON).
`;
}

function buildMediumPrompt(code: string, language: string): string {
  return `
${getBaseSystemInstructions()}

You are a senior developer. Provide a detailed analysis of the following code.
Include:
- A high-level summary.
- Key components and their responsibilities.
- Potential bugs, edge cases, and performance concerns.
- Suggestions for improvement.

Code (${language}):
${code}

Return your analysis as plain text (not JSON).
`;
}

function buildAdvancedPrompt(code: string, language: string): string {
  return `
${getBaseSystemInstructions()}

You are a Staff Engineer and code auditor. Provide a comprehensive analysis of the following code.
Use the canonical AdvancedAuditResult schema (JSON).

Code (${language}):
${code}

Return valid JSON that matches the AdvancedAuditResult schema.
`;
}

// ============================================================
// 2. Helper: safe slice (to avoid "slice is not a function")
// ============================================================

function safeSlice(value: unknown, start: number, end?: number): string {
  if (typeof value === 'string') {
    return value.slice(start, end);
  }
  return '';
}

// ============================================================
// 3. Helper: extract text from possible JSON response (improved)
// ============================================================

function extractTextFromResponse(content: unknown): string {
  if (typeof content !== 'string') {
    return String(content);
  }
  const trimmed = content.trim();

  // اگر با { یا [ شروع شد، سعی می‌کنیم JSON را parse کنیم
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);

      // اگر یک آبجکت بود
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        // لیست کلیدهای احتمالی برای استخراج متن
        const possibleKeys = ['analysis', 'summary', 'explanation', 'text', 'response', 'output', 'result', 'content', 'message'];

        // کلید اولی که پیدا شد و مقدارش رشته است را برمی‌گردانیم
        for (const key of possibleKeys) {
          if (parsed[key] && typeof parsed[key] === 'string') {
            return parsed[key];
          }
        }

        // اگر آبجکت فقط یک کلید داشت و مقدارش رشته بود، آن را برمی‌گردانیم
        const keys = Object.keys(parsed);
        if (keys.length === 1 && typeof parsed[keys[0]] === 'string') {
          return parsed[keys[0]];
        }

        // در غیر این صورت، برای دیباگ، JSON را به‌صورت خوانا نشان می‌دهیم
        return `[Analysis Result]\n${JSON.stringify(parsed, null, 2)}`;
      }

      // اگر آرایه بود یا هر چیز دیگری، pretty-print می‌کنیم
      return JSON.stringify(parsed, null, 2);
    } catch {
      // اگر JSON معتبر نبود، همان متن را برگردان
      return content;
    }
  }
  return content;
}

// ============================================================
// 4. Main generation function
// ============================================================

export async function generateEducationalContent(
  code: string,
  language: string,
  mode: 'simple' | 'medium' | 'advanced'
): Promise<LegacyGenerateResponse> {
  logger.info(`[ai] Generating ${mode} analysis for ${language}`);

  let systemPrompt: string;
  let userPrompt: string;

  if (mode === 'simple') {
    systemPrompt = getBaseSystemInstructions();
    userPrompt = buildSimplePrompt(code, language);
  } else if (mode === 'medium') {
    systemPrompt = getBaseSystemInstructions();
    userPrompt = buildMediumPrompt(code, language);
  } else {
    systemPrompt = 'You are an expert code auditor. Return only valid JSON.';
    userPrompt = buildAdvancedPrompt(code, language);
  }

  try {
    if (mode === 'simple' || mode === 'medium') {
      const content = await callOpenAI(systemPrompt, userPrompt, {
        responseFormat: 'text',
      });
      const text = extractTextFromResponse(content);

      return {
        analysis: text,
        card_title: 'Code Analysis',
        key_concept: safeSlice(text, 0, 200),
        what_this_code_does: text,
        debug_analysis: '-',
        optimization: '-',
        linkedin_post: 'Check out this code analysis! #Zbloue',
      };
    } else {
      // advanced: JSON response
      const content = await callOpenAIJson<any>(systemPrompt, userPrompt, {
        responseFormat: 'json_object',
      });
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;

      return {
        analysis: parsed.summary || '',
        card_title: parsed.title || 'Code Analysis',
        key_concept: safeSlice(parsed.summary, 0, 200),
        what_this_code_does: parsed.executionOverview?.entryPoints?.join(', ') || '',
        debug_analysis: parsed.findings?.length ? `${parsed.findings.length} findings` : '-',
        optimization: parsed.recommendedActions?.length
          ? parsed.recommendedActions.map((a: any) => a.title).join('; ')
          : '-',
        linkedin_post: parsed.linkedin_post || 'Check out this code analysis! #Zbloue',
        codeWalkthrough: [],
        whatWorksWell: [],
        bugsAndRiskyCases: [],
        edgeCases: [],
        recommendedImprovements: [],
        improvedCode: parsed.improvedCode?.available
          ? {
              available: parsed.improvedCode.available,
              code: parsed.improvedCode.code || '',
              notes: parsed.improvedCode.notes || '',
            }
          : undefined,
        suggestedTests: [],
        scorecard: undefined,
        finalVerdict: parsed.verdict
          ? {
              summary: parsed.verdict.explanation,
              approved: parsed.verdict.status === 'approved' || parsed.verdict.status === 'approved-with-suggestions',
              nextSteps: '',
            }
          : undefined,
        error: undefined,
      };
    }
  } catch (error) {
    logger.error('[ai] Generation failed:', error);
    return {
      error: error instanceof Error ? error.message : 'AI generation failed',
      card_title: 'Error',
      analysis: 'Failed to generate analysis.',
      key_concept: '',
      what_this_code_does: '',
      debug_analysis: '',
      optimization: '',
      linkedin_post: '',
    };
  }
}