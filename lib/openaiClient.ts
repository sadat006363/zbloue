// lib/openaiClient.ts

import OpenAI from 'openai';
import type { z } from 'zod';

// ============================================================
// 🔥 تنظیمات مدل‌ها (برای حالت مستقیم و Gateway)
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
// 🔥 کلاینت OpenAI (برای حالت مستقیم)
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
// 🔥 تابع اصلی (با پشتیبانی از Gateway یا مستقیم)
// ============================================================

export async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  options: OpenAICallOptions = {}
): Promise<string> {
  const mode = options.mode || 'advanced';
  const config = MODEL_CONFIG[mode];

  // ===== اگر Gateway فعال است =====
  if (process.env.LLM_GATEWAY_ENABLED !== 'false') {
    console.log('[Gateway] Using LLM Gateway for mode:', mode);
    try {
      const { callLLM } = await import('./llm-gateway');
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
        rootRequestId: `callOpenAI-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      });

      if (result.success && result.data !== undefined) {
        console.log('[Gateway] Success, raw content length:', result.data.length);
        return result.data as string;
      }
      console.warn('[Gateway] Failed, error:', result.error);
      throw new Error(result.error?.message || 'LLM Gateway request failed');
    } catch (gatewayError) {
      console.error('[Gateway] Exception:', gatewayError);
      // اگر Gateway خطا داد، به حالت مستقیم برگردیم
      console.warn('[Gateway] Falling back to direct OpenAI call');
    }
  }

  // ===== حالت مستقیم (زمانی که Gateway غیرفعال است یا خطا داد) =====
  console.log('[OpenAI] Direct call for mode:', mode);

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

    const content = response.choices[0]?.message?.content || '';
    console.log('[OpenAI] Direct call success, content length:', content.length);
    return content;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    console.error('[OpenAI] Direct call error:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000}s`);
    }
    throw error;
  }
}

// ============================================================
// 🔥 تابع JSON (با Gateway یا مستقیم)
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
    console.error('[OpenAI] JSON Parse Error:', parseError);
    console.error('[OpenAI] Raw content:', content);
    throw new Error('AI response format error. Please try again.');
  }
}

// ============================================================
// 🔥 Export مستقیم Gateway برای استفاده در Pipeline
// ============================================================

export { callLLM, callLLMJson } from './llm-gateway';
export type { GatewayRequest, GatewayResult } from './llm-gateway';