// lib/llm-gateway.ts

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import {
  LLM_MODELS,
  ADVANCED_MODEL_ROLES,
  getModelByKey,
  type ModelCapability,
  type AdvancedModelRole,
} from './llm-registry';
import logger from './logger';

// ============================================================
// 🔥 Configuration
// ============================================================

const REQUEST_TIMEOUT_MS = parseInt(process.env.OPENAI_REQUEST_TIMEOUT_MS || '150000', 10);
const MAX_RETRIES = parseInt(process.env.OPENAI_MAX_RETRIES || '1', 10);
const GATEWAY_ENABLED = process.env.LLM_GATEWAY_ENABLED !== 'false';

// ============================================================
// 🔥 OpenAI Client
// ============================================================

const openaiApiKey = process.env.OPENAI_API_KEY || '';
if (!openaiApiKey) {
  console.warn('⚠️ OPENAI_API_KEY is not set. OpenAI will fail.');
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
  timeout: REQUEST_TIMEOUT_MS,
});

// ============================================================
// 🔥 Anthropic Client
// ============================================================

const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
if (!anthropicApiKey) {
  console.warn('⚠️ ANTHROPIC_API_KEY is not set. Anthropic will fail.');
}

const anthropic = new Anthropic({
  apiKey: anthropicApiKey,
});

// ============================================================
// 🔥 Groq Client (برای Llama, Mistral و ...)
// ============================================================

const groqApiKey = process.env.GROQ_API_KEY || '';
if (!groqApiKey) {
  console.warn('⚠️ GROQ_API_KEY is not set. Groq will fail.');
}

const groq = new Groq({
  apiKey: groqApiKey,
});

// ============================================================
// 🔥 Types
// ============================================================

export interface GatewayRequest {
  systemPrompt: string;
  userPrompt: string;
  role?: AdvancedModelRole;
  modelKey?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json_object' | 'text';
  schema?: z.ZodSchema;
  requestId?: string;
  rootRequestId?: string;
  metadata?: Record<string, unknown>;
  disableFallback?: boolean;
  deadline?: number;
  provider?: 'openai' | 'anthropic' | 'groq' | 'auto';
}

export interface GatewayResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: NormalizedLLMError;
  modelUsed: string;
  modelKey: string;
  api: string;
  provider: 'openai' | 'anthropic' | 'groq';
  attempt: number;
  durationMs: number;
}

export interface NormalizedLLMError {
  code: LLMErrorCode;
  message: string;
  retryable: boolean;
  providerStatus?: number;
  providerCode?: string;
  model?: string;
  requestId?: string;
  rootRequestId?: string;
  attempt?: number;
  cause?: string;
}

export type LLMErrorCode =
  | 'AUTHENTICATION_ERROR'
  | 'MODEL_UNAVAILABLE'
  | 'UNSUPPORTED_PARAMETER'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_RESPONSE'
  | 'SCHEMA_VALIDATION_FAILED'
  | 'BAD_REQUEST'
  | 'UNKNOWN';

// ============================================================
// 🔥 Error Classification
// ============================================================

function classifyError(
  error: unknown,
  modelKey: string,
  rootRequestId?: string,
  provider: 'openai' | 'anthropic' | 'groq' = 'openai'
): NormalizedLLMError {
  const defaultError: NormalizedLLMError = {
    code: 'UNKNOWN',
    message: 'An unknown error occurred',
    retryable: false,
    model: modelKey,
    rootRequestId,
  };

  if (!error || typeof error !== 'object') return defaultError;

  const err = error as any;
  const status = err.status || err.statusCode;
  const providerCode = err.code || err.error?.code;
  const providerMessage = err.message || err.error?.message || '';

  // ===== Timeout/Abort =====
  const isAbort = err.name === 'AbortError' ||
    err.code === 'ABORT_ERR' ||
    err.code === 'ETIMEDOUT' ||
    providerMessage.toLowerCase().includes('timeout') ||
    providerMessage.toLowerCase().includes('aborted');

  if (isAbort) {
    return {
      code: 'TIMEOUT',
      message: 'The model request exceeded the configured timeout.',
      retryable: true,
      providerStatus: status || 504,
      providerCode: 'TIMEOUT',
      model: modelKey,
      rootRequestId,
    };
  }

  // ===== Authentication =====
  if (status === 401 || providerCode === 'invalid_api_key' || providerMessage.includes('API key')) {
    return {
      code: 'AUTHENTICATION_ERROR',
      message: `Invalid ${provider} API key. Please check your configuration.`,
      retryable: false,
      providerStatus: status,
      providerCode,
      model: modelKey,
      rootRequestId,
    };
  }

  // ===== Model Not Found =====
  if (status === 404 || providerCode === 'model_not_found' || providerMessage.includes('model')) {
    return {
      code: 'MODEL_UNAVAILABLE',
      message: `Model "${modelKey}" is not available on ${provider}.`,
      retryable: false,
      providerStatus: status,
      providerCode,
      model: modelKey,
      rootRequestId,
    };
  }

  // ===== Rate Limiting =====
  if (status === 429 || providerCode === 'rate_limit_exceeded') {
    return {
      code: 'RATE_LIMITED',
      message: `Rate limit exceeded on ${provider}. Please try again later.`,
      retryable: true,
      providerStatus: status,
      providerCode,
      model: modelKey,
      rootRequestId,
    };
  }

  // ===== Server Errors =====
  if (status && status >= 500 && status < 600) {
    return {
      code: 'PROVIDER_UNAVAILABLE',
      message: `${provider} service is temporarily unavailable.`,
      retryable: true,
      providerStatus: status,
      providerCode,
      model: modelKey,
      rootRequestId,
    };
  }

  // ===== Bad Request =====
  if (status === 400) {
    return {
      code: 'BAD_REQUEST',
      message: providerMessage || 'Invalid request.',
      retryable: false,
      providerStatus: status,
      providerCode,
      model: modelKey,
      rootRequestId,
    };
  }

  return {
    code: 'UNKNOWN',
    message: providerMessage || `An unknown error occurred on ${provider}`,
    retryable: false,
    providerStatus: status,
    providerCode,
    model: modelKey,
    rootRequestId,
  };
}

// ============================================================
// 🔥 Sleep with Jitter
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBackoffDelay(attempt: number): number {
  const base = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  const jitter = Math.random() * 200;
  return base + jitter;
}

// ============================================================
// 🔥 Execute OpenAI Call
// ============================================================

async function executeOpenAICall(
  model: ModelCapability,
  systemPrompt: string,
  userPrompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'json_object' | 'text';
    signal?: AbortSignal;
    timeoutMs?: number;
  }
): Promise<{ content: string; model: string; api: string; provider: 'openai' }> {
  console.log(`  🔵 [OpenAI] Executing with model: ${model.model}`);

  const payload: any = {
    model: model.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };

  const maxTokens = options.maxTokens || model.defaultMaxTokens;
  payload[model.tokenParam] = maxTokens;

  if (model.supportsTemperature && options.temperature !== undefined) {
    payload.temperature = options.temperature;
  } else if (model.supportsTemperature) {
    payload.temperature = 0.3;
  }

  if (model.supportsReasoning && model.reasoningEffort) {
    payload.reasoning = { effort: model.reasoningEffort };
  }

  if (options.responseFormat === 'json_object') {
    payload.response_format = { type: 'json_object' };
  }

  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await openai.chat.completions.create(payload, {
      signal: options.signal || controller.signal,
    });
    clearTimeout(timer);
    const content = response.choices[0]?.message?.content || '';
    console.log(`  ✅ [OpenAI] Success, tokens: ${response.usage?.total_tokens || 'unknown'}`);
    return {
      content,
      model: model.model,
      api: 'chat-completions',
      provider: 'openai',
    };
  } catch (error) {
    clearTimeout(timer);
    console.error(`  ❌ [OpenAI] Error:`, error);
    throw error;
  }
}

// ============================================================
// 🔥 Execute Anthropic Call
// ============================================================

async function executeAnthropicCall(
  modelKey: string,
  systemPrompt: string,
  userPrompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    signal?: AbortSignal;
    timeoutMs?: number;
  }
): Promise<{ content: string; model: string; api: string; provider: 'anthropic' }> {
  console.log(`  🟣 [Anthropic] Executing with model: ${modelKey}`);

  const model = modelKey === 'claude-3-5-sonnet' ? 'claude-3-5-sonnet-20241022' :
                modelKey === 'claude-3-opus' ? 'claude-3-opus-20240229' :
                modelKey === 'claude-3-haiku' ? 'claude-3-haiku-20240307' :
                'claude-3-5-sonnet-20241022';

  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await anthropic.messages.create({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 8000,
    }, {
      signal: options.signal || controller.signal,
    });

    clearTimeout(timer);

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

    console.log(`  ✅ [Anthropic] Success`);

    return {
      content,
      model: response.model,
      api: 'messages',
      provider: 'anthropic',
    };
  } catch (error) {
    clearTimeout(timer);
    console.error(`  ❌ [Anthropic] Error:`, error);
    throw error;
  }
}

// ============================================================
// 🔥 Execute Groq Call (برای Llama, Mistral و ...)
// ============================================================

async function executeGroqCall(
  modelKey: string,
  systemPrompt: string,
  userPrompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'json_object' | 'text';
    signal?: AbortSignal;
    timeoutMs?: number;
  }
): Promise<{ content: string; model: string; api: string; provider: 'groq' }> {
  console.log(`  🟢 [Groq] Executing with model: ${modelKey}`);

  // مدل‌های پشتیبانی‌شده توسط Groq
  const modelMap: Record<string, string> = {
    'llama-3.1-70b': 'llama-3.1-70b-versatile',
    'llama-3.1-8b': 'llama-3.1-8b-instant',
    'llama3-70b': 'llama3-70b-8192',
    'llama3-8b': 'llama3-8b-8192',
    'mixtral-8x7b': 'mixtral-8x7b-32768',
    'gemma2-9b': 'gemma2-9b-it',
    'gemma-7b': 'gemma-7b-it',
  };

  const model = modelMap[modelKey] || modelKey;

  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // 🔥 توجه: Groq فعلاً از response_format پشتیبانی نمی‌کند،
  // بنابراین اگر responseFormat=json_object باشد، در پرامپت تأکید می‌کنیم.
  let finalUserPrompt = userPrompt;
  if (options.responseFormat === 'json_object') {
    finalUserPrompt =
      `IMPORTANT: Return ONLY valid JSON. Do not use Markdown fences. Do not include any text before or after the JSON.\n\n${userPrompt}`;
  }

  try {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: finalUserPrompt },
      ],
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 8000,
    }, {
      signal: options.signal || controller.signal,
    });

    clearTimeout(timer);

    const content = response.choices[0]?.message?.content || '';

    console.log(`  ✅ [Groq] Success, tokens: ${response.usage?.total_tokens || 'unknown'}`);

    return {
      content,
      model: response.model,
      api: 'chat-completions',
      provider: 'groq',
    };
  } catch (error) {
    clearTimeout(timer);
    console.error(`  ❌ [Groq] Error:`, error);
    throw error;
  }
}

// ============================================================
// 🔥 Determine Provider and Model List
// ============================================================

function getProviderModels(
  request: GatewayRequest
): Array<{ provider: 'openai' | 'anthropic' | 'groq'; modelKey: string; model: ModelCapability | null }> {
  const models: Array<{ provider: 'openai' | 'anthropic' | 'groq'; modelKey: string; model: ModelCapability | null }> = [];

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 [LLM Gateway] ===== BUILDING PROVIDER LIST =====`);
  console.log(`📌 [LLM Gateway] Request provider: ${request.provider || 'auto'}`);
  console.log(`📌 [LLM Gateway] Request role: ${request.role || 'not specified'}`);
  console.log(`${'='.repeat(60)}`);

  // ===== اگر provider مشخص شده =====
  if (request.provider === 'openai') {
    console.log(`🔍 [LLM Gateway] Provider manually set to: OPENAI`);
    const keys = request.modelKey ? [request.modelKey] : ['gpt-4o', 'gpt-4o-mini'];
    for (const key of keys) {
      const model = getModelByKey(key);
      if (model) {
        models.push({ provider: 'openai', modelKey: key, model });
        console.log(`  ✅ Added OpenAI model: ${key}`);
      }
    }
    console.log(`📊 [LLM Gateway] Total models: ${models.length}`);
    console.log(`${'='.repeat(60)}\n`);
    return models;
  }

  if (request.provider === 'anthropic') {
    console.log(`🔍 [LLM Gateway] Provider manually set to: ANTHROPIC`);
    const keys = ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'];
    models.push(
      ...keys.map((key) => ({
        provider: 'anthropic' as const,
        modelKey: key,
        model: null,
      }))
    );
    keys.forEach(key => console.log(`  ✅ Added Anthropic model: ${key}`));
    console.log(`📊 [LLM Gateway] Total models: ${models.length}`);
    console.log(`${'='.repeat(60)}\n`);
    return models;
  }

  if (request.provider === 'groq') {
    console.log(`🔍 [LLM Gateway] Provider manually set to: GROQ`);
    const keys = ['llama-3.1-70b', 'llama-3.1-8b', 'mixtral-8x7b', 'gemma2-9b'];
    models.push(
      ...keys.map((key) => ({
        provider: 'groq' as const,
        modelKey: key,
        model: null,
      }))
    );
    keys.forEach(key => console.log(`  ✅ Added Groq model: ${key}`));
    console.log(`📊 [LLM Gateway] Total models: ${models.length}`);
    console.log(`${'='.repeat(60)}\n`);
    return models;
  }

  // ===== Auto =====
  console.log(`🔍 [LLM Gateway] Provider: AUTO (will try OpenAI → Anthropic → Groq)`);

  // تشخیص نقش (role)
  let role = request.role || 'primary';
  let isCostFallback = false;

  // اگر role === 'costFallback' باشد، Groq را اولویت بده
  if (role === 'costFallback') {
    isCostFallback = true;
    console.log(`🔍 [LLM Gateway] Role detected: costFallback → Groq will have HIGHEST priority`);
    role = 'codeFallback';
  } else {
    console.log(`🔍 [LLM Gateway] Role detected: ${role}`);
  }

  // لیست کلیدهای OpenAI بر اساس role
  let openaiKeys: string[];
  if (request.modelKey) {
    openaiKeys = [request.modelKey];
  } else {
    const roleMap: Record<AdvancedModelRole, string[]> = {
      primary: ['gpt-4o', 'gpt-4o-mini'],
      codeFallback: ['gpt-4o-mini', 'gpt-4o'],
      stableFallback: ['gpt-4o-mini'],
      costFallback: ['gpt-4o-mini'],
    };
    openaiKeys = roleMap[role as AdvancedModelRole] || ['gpt-4o', 'gpt-4o-mini'];
  }

  // ===== اگر costFallback است، Groq را اول اضافه کن =====
  if (isCostFallback && groqApiKey) {
    console.log(`🔍 [LLM Gateway] → Adding Groq models (HIGHEST priority for cost optimization)`);
    models.push(
      { provider: 'groq', modelKey: 'llama-3.1-70b', model: null },
      { provider: 'groq', modelKey: 'mixtral-8x7b', model: null },
      { provider: 'groq', modelKey: 'llama-3.1-8b', model: null }
    );
    console.log(`  ✅ Added Groq: llama-3.1-70b (primary)`);
    console.log(`  ✅ Added Groq: mixtral-8x7b (fallback)`);
    console.log(`  ✅ Added Groq: llama-3.1-8b (lightweight)`);
  }

  // ===== اضافه کردن OpenAI =====
  console.log(`🔍 [LLM Gateway] → Adding OpenAI models`);
  for (const key of openaiKeys) {
    const model = getModelByKey(key);
    if (model) {
      models.push({ provider: 'openai', modelKey: key, model });
      console.log(`  ✅ Added OpenAI: ${key}`);
    }
  }

  // ===== اضافه کردن Anthropic (اگر API Key موجود باشد) =====
  if (anthropicApiKey) {
    console.log(`🔍 [LLM Gateway] → Adding Anthropic models (API key available)`);
    models.push(
      { provider: 'anthropic', modelKey: 'claude-3-5-sonnet', model: null },
      { provider: 'anthropic', modelKey: 'claude-3-haiku', model: null }
    );
    console.log(`  ✅ Added Anthropic: claude-3-5-sonnet`);
    console.log(`  ✅ Added Anthropic: claude-3-haiku`);
  } else {
    console.log(`🔍 [LLM Gateway] → Anthropic models SKIPPED (no API key)`);
  }

  // ===== اگر costFallback نبود، Groq را در انتها اضافه کن (به عنوان آخرین گزینه) =====
  if (!isCostFallback && groqApiKey) {
    console.log(`🔍 [LLM Gateway] → Adding Groq models (LOWEST priority - last resort)`);
    models.push(
      { provider: 'groq', modelKey: 'llama-3.1-70b', model: null },
      { provider: 'groq', modelKey: 'mixtral-8x7b', model: null },
      { provider: 'groq', modelKey: 'llama-3.1-8b', model: null }
    );
    console.log(`  ✅ Added Groq: llama-3.1-70b (last resort)`);
  }

  console.log(`📊 [LLM Gateway] Total models in list: ${models.length}`);
  console.log(`📋 [LLM Gateway] Final provider order:`);
  models.forEach((m, i) => {
    console.log(`  ${i+1}. ${m.provider.toUpperCase()} (${m.modelKey})`);
  });
  console.log(`${'='.repeat(60)}\n`);

  return models;
}

// ============================================================
// 🔥 Main Gateway Function
// ============================================================

export async function callLLM<T = unknown>(
  request: GatewayRequest
): Promise<GatewayResult<T>> {
  const startTime = Date.now();
  const rootRequestId = request.rootRequestId || request.requestId || randomUUID();
  const requestId = request.requestId || randomUUID();

  console.log(`\n${'🚀'.repeat(30)}`);
  console.log(`🚀 [LLM Gateway] ===== STARTING REQUEST =====`);
  console.log(`📌 [LLM Gateway] Request ID: ${rootRequestId}`);
  console.log(`📌 [LLM Gateway] Timestamp: ${new Date().toISOString()}`);
  console.log(`📌 [LLM Gateway] Provider: ${request.provider || 'auto'}`);
  console.log(`📌 [LLM Gateway] Role: ${request.role || 'not specified'}`);
  console.log(`📌 [LLM Gateway] Response format: ${request.responseFormat || 'json_object'}`);
  console.log(`${'🚀'.repeat(30)}\n`);

  const providerModels = getProviderModels(request);

  if (providerModels.length === 0) {
    console.error(`\n❌ [LLM Gateway] No models available! Check your API keys.\n`);
    return {
      success: false,
      error: {
        code: 'MODEL_UNAVAILABLE',
        message: 'No models available. Check your API keys.',
        retryable: false,
        rootRequestId,
      },
      modelUsed: 'unknown',
      modelKey: 'unknown',
      api: 'unknown',
      provider: 'openai',
      attempt: 0,
      durationMs: Date.now() - startTime,
    };
  }

  const deadline = request.deadline || Date.now() + REQUEST_TIMEOUT_MS * 2;
  const minBudgetMs = 10000;

  let lastError: NormalizedLLMError | null = null;
  let attempts = 0;

  for (const entry of providerModels) {
    const { provider, modelKey, model } = entry;

    let retryCount = 0;
    let shouldRetry = true;

    while (shouldRetry && retryCount <= MAX_RETRIES) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < minBudgetMs) {
        console.warn(`⏰ [LLM Gateway] Time budget exhausted for ${provider}`);
        lastError = {
          code: 'TIMEOUT',
          message: 'Pipeline time budget exhausted',
          retryable: false,
          model: modelKey,
          rootRequestId,
          attempt: attempts + 1,
        };
        break;
      }

      const attemptTimeout = Math.min(REQUEST_TIMEOUT_MS, remainingMs - 5000);
      attempts++;

      console.log(`\n${'─'.repeat(50)}`);
      console.log(`🔄 [LLM Gateway] Attempt ${attempts} on ${provider.toUpperCase()} (model: ${modelKey})`);
      console.log(`⏱️  Timeout: ${attemptTimeout}ms`);
      console.log(`📊 Retry count: ${retryCount}/${MAX_RETRIES}`);
      console.log(`${'─'.repeat(50)}`);

      try {
        let result: { content: string; model: string; api: string; provider: 'openai' | 'anthropic' | 'groq' };

        console.log(`⏳ [LLM Gateway] Executing ${provider.toUpperCase()} call...`);

        if (provider === 'openai' && model) {
          result = await executeOpenAICall(
            model,
            request.systemPrompt,
            request.userPrompt,
            {
              temperature: request.temperature,
              maxTokens: request.maxTokens,
              responseFormat: request.responseFormat || 'json_object',
              timeoutMs: attemptTimeout,
            }
          );
        } else if (provider === 'anthropic') {
          result = await executeAnthropicCall(
            modelKey,
            request.systemPrompt,
            request.userPrompt,
            {
              temperature: request.temperature,
              maxTokens: request.maxTokens || 8000,
              timeoutMs: attemptTimeout,
            }
          );
        } else if (provider === 'groq') {
          result = await executeGroqCall(
            modelKey,
            request.systemPrompt,
            request.userPrompt,
            {
              temperature: request.temperature,
              maxTokens: request.maxTokens || 8000,
              responseFormat: request.responseFormat || 'json_object',
              timeoutMs: attemptTimeout,
            }
          );
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }

        console.log(`✅ [LLM Gateway] ${provider.toUpperCase()} call SUCCESS`);
        console.log(`📊 [LLM Gateway] Model used: ${result.model}`);
        console.log(`📊 [LLM Gateway] Content length: ${result.content.length}`);

        // ===== Zod Validation =====
        let parsedData: T | undefined;
        let validationError: NormalizedLLMError | null = null;

        if (request.schema) {
          console.log(`🔍 [LLM Gateway] Validating response with Zod schema...`);
          try {
            const parsed = request.schema.safeParse(JSON.parse(result.content));
            if (parsed.success) {
              parsedData = parsed.data as T;
              console.log(`✅ [LLM Gateway] Zod validation SUCCESS`);
            } else {
              validationError = {
                code: 'SCHEMA_VALIDATION_FAILED',
                message: 'Zod validation failed',
                retryable: false,
                model: modelKey,
                rootRequestId,
                attempt: attempts,
                cause: JSON.stringify(parsed.error.issues),
              };
              console.warn(`⚠️ [LLM Gateway] Zod validation FAILED:`, parsed.error.issues);
            }
          } catch (parseError) {
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const repaired = JSON.parse(jsonMatch[0]);
                if (request.schema.safeParse(repaired).success) {
                  parsedData = repaired as T;
                  console.log(`✅ [LLM Gateway] JSON repair SUCCESS`);
                } else {
                  validationError = {
                    code: 'INVALID_RESPONSE',
                    message: 'Invalid JSON after repair',
                    retryable: false,
                    model: modelKey,
                    rootRequestId,
                    attempt: attempts,
                  };
                  console.warn(`⚠️ [LLM Gateway] JSON repair FAILED`);
                }
              } catch {
                validationError = {
                  code: 'INVALID_RESPONSE',
                  message: 'Failed to repair JSON',
                  retryable: false,
                  model: modelKey,
                  rootRequestId,
                  attempt: attempts,
                };
                console.warn(`⚠️ [LLM Gateway] JSON parse FAILED`);
              }
            } else {
              validationError = {
                code: 'INVALID_RESPONSE',
                message: 'No JSON found in response',
                retryable: false,
                model: modelKey,
                rootRequestId,
                attempt: attempts,
              };
              console.warn(`⚠️ [LLM Gateway] No JSON found in response`);
            }
          }
        } else {
          parsedData = result.content as T;
          console.log(`✅ [LLM Gateway] No schema validation (text mode)`);
        }

        if (validationError) {
          lastError = validationError;
          console.warn(`⚠️ [LLM Gateway] Validation error, breaking to next provider`);
          break;
        }

        // ===== Success =====
        const durationMs = Date.now() - startTime;
        console.log(`\n${'🏁'.repeat(30)}`);
        console.log(`🏁 [LLM Gateway] ===== REQUEST COMPLETED =====`);
        console.log(`✅ [LLM Gateway] FINAL RESULT: ${provider.toUpperCase()} (${result.model})`);
        console.log(`⏱️  Total duration: ${durationMs}ms`);
        console.log(`📊 Attempts: ${attempts}`);
        console.log(`📊 Retries: ${retryCount}`);
        console.log(`${'🏁'.repeat(30)}\n`);

        logger.info('[LLM Gateway] Request successful', {
          rootRequestId,
          provider,
          modelKey,
          model: result.model,
          attempt: attempts,
          durationMs,
        });

        return {
          success: true,
          data: parsedData,
          modelUsed: result.model,
          modelKey,
          api: result.api,
          provider: result.provider,
          attempt: attempts,
          durationMs,
        };
      } catch (error) {
        const normalized = classifyError(error, modelKey, rootRequestId, provider);
        console.error(`❌ [LLM Gateway] ${provider.toUpperCase()} call FAILED:`);
        console.error(`  📌 Error: ${normalized.message}`);
        console.error(`  📌 Code: ${normalized.code}`);
        console.error(`  📌 Retryable: ${normalized.retryable}`);

        if (normalized.providerStatus) {
          console.error(`  📌 Status: ${normalized.providerStatus}`);
        }

        if (normalized.retryable && retryCount < MAX_RETRIES && !request.disableFallback) {
          retryCount++;
          const delay = getBackoffDelay(retryCount);
          console.log(`🔄 [LLM Gateway] Retrying ${provider.toUpperCase()} in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);
          logger.warn(`[LLM Gateway] Retryable error on ${provider}, retrying in ${delay}ms`, {
            rootRequestId,
            modelKey,
            attempt: attempts,
            retryCount,
            errorCode: normalized.code,
          });
          await sleep(delay);
          continue;
        }

        lastError = normalized;

        if (normalized.code === 'AUTHENTICATION_ERROR') {
          console.error(`❌ [LLM Gateway] Authentication error on ${provider.toUpperCase()}, aborting this provider`);
          logger.error(`[LLM Gateway] Authentication error on ${provider}, aborting`, {
            rootRequestId,
            modelKey,
          });
          break;
        }

        if (!normalized.retryable) {
          console.warn(`⚠️ [LLM Gateway] Non-retryable error on ${provider.toUpperCase()}, trying next provider`);
          break;
        }

        break;
      }
    }
  }

  // ===== All providers failed =====
  const durationMs = Date.now() - startTime;
  const finalError = lastError || {
    code: 'UNKNOWN',
    message: 'All providers failed',
    retryable: false,
    rootRequestId,
    attempt: attempts,
  };

  console.log(`\n${'❌'.repeat(30)}`);
  console.log(`❌ [LLM Gateway] ===== ALL PROVIDERS FAILED =====`);
  console.log(`❌ [LLM Gateway] Final error: ${finalError.message}`);
  console.log(`❌ [LLM Gateway] Total duration: ${durationMs}ms`);
  console.log(`❌ [LLM Gateway] Total attempts: ${attempts}`);
  console.log(`❌ [LLM Gateway] Request ID: ${rootRequestId}`);
  console.log(`${'❌'.repeat(30)}\n`);

  logger.error('[LLM Gateway] All providers failed', {
    rootRequestId,
    attempts,
    durationMs,
    errorCode: finalError.code,
    errorMessage: finalError.message,
  });

  return {
    success: false,
    error: finalError,
    modelUsed: 'unknown',
    modelKey: 'unknown',
    api: 'unknown',
    provider: 'openai',
    attempt: attempts,
    durationMs,
  };
}

// ============================================================
// 🔥 Convenience JSON Wrapper
// ============================================================

export async function callLLMJson<T>(
  systemPrompt: string,
  userPrompt: string,
  options: {
    role?: AdvancedModelRole;
    modelKey?: string;
    schema: z.ZodSchema<T>;
    temperature?: number;
    maxTokens?: number;
    requestId?: string;
    rootRequestId?: string;
    metadata?: Record<string, unknown>;
    disableFallback?: boolean;
    deadline?: number;
    provider?: 'openai' | 'anthropic' | 'groq' | 'auto';
  }
): Promise<GatewayResult<T>> {
  return callLLM<T>({
    systemPrompt,
    userPrompt,
    role: options.role,
    modelKey: options.modelKey,
    schema: options.schema,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    requestId: options.requestId,
    rootRequestId: options.rootRequestId,
    metadata: options.metadata,
    disableFallback: options.disableFallback,
    deadline: options.deadline,
    provider: options.provider,
    responseFormat: 'json_object',
  });
}