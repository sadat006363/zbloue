// lib/openaiClient.ts

import OpenAI from 'openai';

// ============================================================
// 🔥 تنظیمات مدل‌ها
// ============================================================

export const MODEL_CONFIG = {
  simple: {
    model: process.env.OPENAI_MODEL_SIMPLE || 'gpt-4o-mini',
    maxCompletionTokens: parseInt(process.env.OPENAI_MAX_TOKENS_SIMPLE || '4000', 10),
    timeout: parseInt(process.env.OPENAI_TIMEOUT_SIMPLE || '30000', 10),
    temperature: 0.3,
  },
  medium: {
    model: process.env.OPENAI_MODEL_MEDIUM || 'gpt-4o-mini',
    maxCompletionTokens: parseInt(process.env.OPENAI_MAX_TOKENS_MEDIUM || '6000', 10),
    timeout: parseInt(process.env.OPENAI_TIMEOUT_MEDIUM || '45000', 10),
    temperature: 0.3,
  },
  advanced: {
    model: process.env.OPENAI_MODEL_ADVANCED || 'gpt-4o',
    maxCompletionTokens: parseInt(process.env.OPENAI_MAX_TOKENS_ADVANCED || '16000', 10),
    timeout: parseInt(process.env.OPENAI_TIMEOUT_ADVANCED || '90000', 10),
    temperature: 0.2,
  },
} as const;

export type ModelMode = keyof typeof MODEL_CONFIG;

// ============================================================
// 🔥 کلاینت OpenAI
// ============================================================

const openaiApiKey = process.env.OPENAI_API_KEY || '';
if (!openaiApiKey) {
  console.warn('⚠️ OPENAI_API_KEY is not set.');
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// ============================================================
// 🔥 گزینه‌های فراخوانی
// ============================================================

export interface OpenAICallOptions {
  mode?: ModelMode;
  model?: string;
  maxCompletionTokens?: number;
  timeout?: number;
  temperature?: number;
  responseFormat?: 'json_object' | 'text';
  signal?: AbortSignal;
}

// ============================================================
// 🔥 تابع اصلی (مستقیم)
// ============================================================

export async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  options: OpenAICallOptions = {}
): Promise<string> {
  // اگر Gateway فعال است، از آن استفاده کن
  if (process.env.LLM_GATEWAY_ENABLED !== 'false') {
    const { callLLM } = await import('./llm-gateway');
    const mode = options.mode || 'advanced';
    const config = MODEL_CONFIG[mode];
    const roleMap: Record<ModelMode, 'primary' | 'codeFallback' | 'stableFallback'> = {
      simple: 'stableFallback',
      medium: 'codeFallback',
      advanced: 'primary',
    };

    const result = await callLLM<string>({
      systemPrompt,
      userPrompt,
      role: roleMap[mode],
      temperature: options.temperature ?? config.temperature,
      maxTokens: options.maxCompletionTokens || config.maxCompletionTokens,
      responseFormat: options.responseFormat || 'json_object',
    });

    if (result.success && result.data !== undefined) {
      return result.data as string;
    }
    throw new Error(result.error?.message || 'Gateway request failed');
  }

  // ===== حالت مستقیم (زمانی که Gateway غیرفعال است) =====
  const mode = options.mode || 'advanced';
  const config = MODEL_CONFIG[mode];

  const model = options.model || config.model;
  const maxCompletionTokens = options.maxCompletionTokens || config.maxCompletionTokens;
  const timeout = options.timeout || config.timeout;
  const temperature = options.temperature ?? config.temperature;
  const responseFormat = options.responseFormat || 'json_object';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await openai.chat.completions.create(
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format:
          responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
        temperature,
        max_completion_tokens: maxCompletionTokens,
      },
      { signal: options.signal || controller.signal }
    );

    clearTimeout(timeoutId);
    return response.choices[0].message.content || '{}';
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000}s`);
    }
    throw error;
  }
}

// ============================================================
// 🔥 تابع JSON
// ============================================================

export async function callOpenAIJson<T>(
  systemPrompt: string,
  userPrompt: string,
  options: OpenAICallOptions = {}
): Promise<T> {
  const content = await callOpenAI(systemPrompt, userPrompt, {
    ...options,
    responseFormat: 'json_object',
  });

  try {
    return JSON.parse(content) as T;
  } catch (parseError) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[OpenAI] JSON Parse Error:', parseError);
      console.error('[OpenAI] Raw content:', content);
    }
    throw new Error('AI response format error. Please try again.');
  }
}