// lib/llm-gateway.ts

import OpenAI from 'openai';
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
  console.warn('⚠️ OPENAI_API_KEY is not set. LLM Gateway will fail.');
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
  timeout: REQUEST_TIMEOUT_MS,
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
  disableFallback?: boolean; // برای Legacy
  deadline?: number; // زمان مطلق (timestamp) برای کل pipeline
}

export interface GatewayResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: NormalizedLLMError;
  modelUsed: string;
  modelKey: string;
  api: string;
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
// 🔥 Error Classification (اصلاح شده)
// ============================================================

function classifyError(error: unknown, modelKey: string, rootRequestId?: string): NormalizedLLMError {
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

  // ===== تشخیص Timeout/Abort =====
  const isAbort = err.name === 'AbortError' ||
    err.code === 'ABORT_ERR' ||
    err.code === 'ETIMEDOUT' ||
    providerMessage.toLowerCase().includes('request was aborted') ||
    providerMessage.toLowerCase().includes('aborted') ||
    providerMessage.toLowerCase().includes('timeout');

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
      message: 'Invalid OpenAI API key. Please check your configuration.',
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
      message: `Model "${modelKey}" is not available.`,
      retryable: false,
      providerStatus: status,
      providerCode,
      model: modelKey,
      rootRequestId,
    };
  }

  // ===== Unsupported Parameter =====
  if (providerCode === 'unsupported_parameter' || providerMessage.includes('unsupported parameter')) {
    return {
      code: 'UNSUPPORTED_PARAMETER',
      message: providerMessage,
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
      message: 'Rate limit exceeded. Please try again later.',
      retryable: true,
      providerStatus: status,
      providerCode,
      model: modelKey,
      rootRequestId,
    };
  }

  // ===== Server Errors (5xx) =====
  if (status && status >= 500 && status < 600) {
    return {
      code: 'PROVIDER_UNAVAILABLE',
      message: 'OpenAI service is temporarily unavailable.',
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

  // ===== Fallback =====
  return {
    code: 'UNKNOWN',
    message: providerMessage || 'An unknown error occurred',
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
// 🔥 Build Payload (بدون پارامترهای ناسازگار)
// ============================================================

function buildPayload(
  model: ModelCapability,
  systemPrompt: string,
  userPrompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'json_object' | 'text';
  }
): any {
  const payload: any = {
    model: model.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };

  // ===== Token parameter =====
  const maxTokens = options.maxTokens || model.defaultMaxTokens;
  payload[model.tokenParam] = maxTokens;

  // ===== Temperature =====
  if (model.supportsTemperature && options.temperature !== undefined) {
    payload.temperature = options.temperature;
  } else if (model.supportsTemperature) {
    payload.temperature = 0.3;
  }
  // اگر supportsTemperature false باشد، temperature ارسال نمی‌شود

  // ===== Reasoning =====
  if (model.supportsReasoning && model.reasoningEffort) {
    payload.reasoning = { effort: model.reasoningEffort };
  }

  // ===== Response format =====
  if (options.responseFormat === 'json_object') {
    payload.response_format = { type: 'json_object' };
  }

  return payload;
}

// ============================================================
// 🔥 Execute Single Model Call
// ============================================================

async function executeModelCall(
  model: ModelCapability,
  systemPrompt: string,
  userPrompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'json_object' | 'text';
    signal?: AbortSignal;
    timeoutMs?: number;
    rootRequestId?: string;
  }
): Promise<{ content: string; model: string; api: string }> {
  const payload = buildPayload(model, systemPrompt, userPrompt, options);
  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;

  const controller = new AbortController();
  let abortedByTimeout = false;

  const timer = setTimeout(() => {
    abortedByTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await openai.chat.completions.create(payload, {
      signal: options.signal || controller.signal,
    });
    clearTimeout(timer);
    const content = response.choices[0]?.message?.content || '';
    return {
      content,
      model: model.model,
      api: 'chat-completions',
    };
  } catch (error) {
    clearTimeout(timer);
    if (abortedByTimeout) {
      throw new Error('Request was aborted by internal timeout.');
    }
    throw error;
  }
}

// ============================================================
// 🔥 Deduplicate Models
// ============================================================

function deduplicateModels(modelKeys: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const key of modelKeys) {
    const model = getModelByKey(key);
    if (!model) continue;
    const signature = `${model.model}|${model.api}`;
    if (!seen.has(signature)) {
      seen.add(signature);
      result.push(key);
    }
  }
  return result;
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

  // ===== Determine model keys to try =====
  let modelKeys: string[];

  if (request.modelKey) {
    modelKeys = [request.modelKey];
  } else if (request.role) {
    const roleMap: Record<AdvancedModelRole, string[]> = {
      primary: ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini'],
      codeFallback: ['gpt-4-turbo', 'gpt-4o-mini', 'gpt-4o'],
      stableFallback: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
    };
    modelKeys = roleMap[request.role] || ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini'];
  } else {
    modelKeys = ['gpt-4o', 'gpt-4-turbo', 'gpt-4o-mini'];
  }

  // ===== Deduplicate =====
  modelKeys = deduplicateModels(modelKeys);

  // ===== اگر fallback غیرفعال است، فقط اولین مدل =====
  if (request.disableFallback) {
    modelKeys = modelKeys.slice(0, 1);
  }

  // ===== Deadline =====
  const deadline = request.deadline || Date.now() + REQUEST_TIMEOUT_MS * 2; // 2x timeout
  const minBudgetMs = 10000; // حداقل ۱۰ ثانیه برای هر تلاش

  let lastError: NormalizedLLMError | null = null;
  let attempts = 0;
  let modelAttempts = 0;

  for (const key of modelKeys) {
    const model = getModelByKey(key);
    if (!model) {
      logger.warn(`[LLM Gateway] Model "${key}" not found in registry, skipping.`, { rootRequestId });
      continue;
    }

    let retryCount = 0;
    let shouldRetry = true;

    while (shouldRetry && retryCount <= MAX_RETRIES) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < minBudgetMs) {
        lastError = {
          code: 'TIMEOUT',
          message: 'Pipeline time budget exhausted',
          retryable: false,
          model: key,
          rootRequestId,
          attempt: attempts + 1,
        };
        break;
      }

      const attemptTimeout = Math.min(REQUEST_TIMEOUT_MS, remainingMs - 5000);
      attempts++;

      try {
        const result = await executeModelCall(
          model,
          request.systemPrompt,
          request.userPrompt,
          {
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            responseFormat: request.responseFormat || 'json_object',
            signal: undefined,
            timeoutMs: attemptTimeout,
            rootRequestId,
          }
        );

        // ===== Zod Validation =====
        let parsedData: T | undefined;
        let validationError: NormalizedLLMError | null = null;

        if (request.schema) {
          try {
            const parsed = request.schema.safeParse(JSON.parse(result.content));
            if (parsed.success) {
              parsedData = parsed.data as T;
            } else {
              validationError = {
                code: 'SCHEMA_VALIDATION_FAILED',
                message: 'Zod validation failed',
                retryable: false,
                model: key,
                rootRequestId,
                attempt: attempts,
                cause: JSON.stringify(parsed.error.issues),
              };
            }
          } catch (parseError) {
            // One repair attempt
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const repaired = JSON.parse(jsonMatch[0]);
                if (request.schema.safeParse(repaired).success) {
                  parsedData = repaired as T;
                } else {
                  validationError = {
                    code: 'INVALID_RESPONSE',
                    message: 'Invalid JSON after repair',
                    retryable: false,
                    model: key,
                    rootRequestId,
                    attempt: attempts,
                  };
                }
              } catch {
                validationError = {
                  code: 'INVALID_RESPONSE',
                  message: 'Failed to repair JSON',
                  retryable: false,
                  model: key,
                  rootRequestId,
                  attempt: attempts,
                };
              }
            } else {
              validationError = {
                code: 'INVALID_RESPONSE',
                message: 'No JSON found in response',
                retryable: false,
                model: key,
                rootRequestId,
                attempt: attempts,
              };
            }
          }
        } else {
          parsedData = result.content as T;
        }

        if (validationError) {
          lastError = validationError;
          break; // try next model
        }

        // ===== Success =====
        const durationMs = Date.now() - startTime;
        logger.info('[LLM Gateway] Request successful', {
          rootRequestId,
          modelKey: key,
          model: model.model,
          api: model.api,
          attempt: attempts,
          durationMs,
        });

        return {
          success: true,
          data: parsedData,
          modelUsed: model.model,
          modelKey: key,
          api: model.api,
          attempt: attempts,
          durationMs,
        };
      } catch (error) {
        const normalized = classifyError(error, key, rootRequestId);

        // ===== Retryable? =====
        if (normalized.retryable && retryCount < MAX_RETRIES && !request.disableFallback) {
          retryCount++;
          const delay = getBackoffDelay(retryCount);
          logger.warn(`[LLM Gateway] Retryable error, retrying in ${delay}ms`, {
            rootRequestId,
            modelKey: key,
            attempt: attempts,
            retryCount,
            errorCode: normalized.code,
          });
          await sleep(delay);
          continue;
        }

        // ===== Non-retryable or max retries =====
        lastError = normalized;

        // ===== Model-specific error → try next model =====
        if (normalized.code === 'MODEL_UNAVAILABLE' || normalized.code === 'UNSUPPORTED_PARAMETER') {
          logger.warn(`[LLM Gateway] Model-specific error, trying next model`, {
            rootRequestId,
            modelKey: key,
            errorCode: normalized.code,
          });
          break; // exit retry loop, move to next model
        }

        // ===== Authentication error → fail immediately =====
        if (normalized.code === 'AUTHENTICATION_ERROR') {
          logger.error('[LLM Gateway] Authentication error, aborting', {
            rootRequestId,
            modelKey: key,
          });
          break;
        }

        // ===== Non-retryable → try next model =====
        if (!normalized.retryable) {
          break;
        }

        // ===== Retryable but max retries exceeded → try next model =====
        break;
      }
    }
  }

  // ===== All models failed =====
  const durationMs = Date.now() - startTime;
  const finalError = lastError || {
    code: 'UNKNOWN',
    message: 'All models failed',
    retryable: false,
    rootRequestId,
    attempt: attempts,
  };

  logger.error('[LLM Gateway] All models failed', {
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
    responseFormat: 'json_object',
  });
}