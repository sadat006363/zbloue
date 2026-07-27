// lib/openaiClient.ts

import OpenAI from 'openai';
import type { z } from 'zod';
import { getRoleForMode, getStrategy } from './llm-strategy';

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

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔥 [OpenAI Client] ===== NEW REQUEST =====`);
  console.log(`📌 [OpenAI Client] Mode: ${mode}`);
  console.log(`📌 [OpenAI Client] Timestamp: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

  // ===== اگر Gateway فعال است =====
  if (process.env.LLM_GATEWAY_ENABLED !== 'false') {
    console.log(`🌐 [OpenAI Client] LLM Gateway is ENABLED`);
    try {
      const { callLLM } = await import('./llm-gateway');

      // ===== 🔥 دریافت Role بر اساس استراتژی =====
      const role = getRoleForMode(mode);
      const strategy = getStrategy();

      console.log(`📊 [OpenAI Client] Strategy: ${strategy}`);
      console.log(`🎯 [OpenAI Client] Role: ${role}`);
      console.log(`🚀 [OpenAI Client] Calling LLM Gateway...`);

      const result = await callLLM<string>({
        systemPrompt,
        userPrompt,
        role: role,
        provider: 'auto',
        temperature: options.temperature ?? config.temperature,
        maxTokens: options.maxCompletionTokens || config.maxCompletionTokens,
        responseFormat: options.responseFormat || 'json_object',
        rootRequestId: `callOpenAI-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      });

      if (result.success && result.data !== undefined) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ [OpenAI Client] ===== REQUEST SUCCESS =====`);
        console.log(`✅ [OpenAI Client] Provider used: ${result.provider.toUpperCase()}`);
        console.log(`✅ [OpenAI Client] Model used: ${result.modelUsed}`);
        console.log(`✅ [OpenAI Client] Attempt: ${result.attempt}`);
        console.log(`⏱️ [OpenAI Client] Duration: ${result.durationMs}ms`);
        console.log(`📊 [OpenAI Client] Response length: ${result.data.length} characters`);
        console.log(`${'='.repeat(60)}\n`);
        return result.data as string;
      }

      console.warn(`\n⚠️ [OpenAI Client] Gateway returned error:`, result.error);
      console.warn(`⚠️ [OpenAI Client] Falling back to direct OpenAI call...`);
    } catch (gatewayError) {
      console.error(`\n❌ [OpenAI Client] Gateway exception:`, gatewayError);
      console.warn(`⚠️ [OpenAI Client] Falling back to direct OpenAI call...`);
    }
  } else {
    console.log(`🌐 [OpenAI Client] LLM Gateway is DISABLED (using direct call)`);
  }

  // ===== حالت مستقیم (زمانی که Gateway غیرفعال است یا خطا داد) =====
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔵 [OpenAI Client] ===== DIRECT OPENAI CALL =====`);
  console.log(`📌 [OpenAI Client] Mode: ${mode}`);
  console.log(`${'='.repeat(60)}\n`);

  const model = options.model || config.model;
  const maxCompletionTokens = options.maxCompletionTokens || config.maxCompletionTokens;
  const timeout = options.timeout || config.timeout;
  const temperature = options.temperature ?? config.temperature;
  const responseFormat = options.responseFormat || 'json_object';

  console.log(`📊 [OpenAI Client] Model: ${model}`);
  console.log(`📊 [OpenAI Client] Max tokens: ${maxCompletionTokens}`);
  console.log(`📊 [OpenAI Client] Timeout: ${timeout}ms`);
  console.log(`📊 [OpenAI Client] Temperature: ${temperature}`);
  console.log(`📊 [OpenAI Client] Response format: ${responseFormat}`);
  console.log(`⏳ [OpenAI Client] Sending request to OpenAI...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const startTime = Date.now();
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
    const duration = Date.now() - startTime;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ [OpenAI Client] ===== DIRECT CALL SUCCESS =====`);
    console.log(`✅ [OpenAI Client] Model: ${model}`);
    console.log(`⏱️ [OpenAI Client] Duration: ${duration}ms`);
    console.log(`📊 [OpenAI Client] Response length: ${content.length} characters`);
    console.log(`📊 [OpenAI Client] Usage:`, response.usage);
    console.log(`${'='.repeat(60)}\n`);

    return content;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    console.error(`\n${'='.repeat(60)}`);
    console.error(`❌ [OpenAI Client] ===== DIRECT CALL FAILED =====`);
    console.error(`❌ [OpenAI Client] Error:`, error);
    console.error(`${'='.repeat(60)}\n`);

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
  console.log(`📦 [OpenAI Client] JSON mode request`);

  const content = await callOpenAI(systemPrompt, userPrompt, {
    ...options,
    responseFormat: 'json_object',
  });

  try {
    const parsed = JSON.parse(content) as T;
    console.log(`✅ [OpenAI Client] JSON parsed successfully`);
    return parsed;
  } catch (parseError) {
    console.error(`❌ [OpenAI Client] JSON Parse Error:`, parseError);
    console.error(`📄 [OpenAI Client] Raw content (first 500 chars):`, content.slice(0, 500));
    throw new Error('AI response format error. Please try again.');
  }
}

// ============================================================
// 🔥 Export مستقیم Gateway برای استفاده در Pipeline
// ============================================================

export { callLLM, callLLMJson } from './llm-gateway';
export type { GatewayRequest, GatewayResult } from './llm-gateway';