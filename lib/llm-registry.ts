// lib/llm-registry.ts

import { z } from 'zod';

// ============================================================
// 🔥 Environment variable helpers with validation
// ============================================================

function getEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function getEnvNumber(key: string, fallback: number): number {
  const val = process.env[key];
  if (val) {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

function getReasoningEffort(): 'low' | 'medium' | 'high' {
  const val = process.env.OPENAI_ADVANCED_REASONING_EFFORT;
  if (val === 'low' || val === 'medium' || val === 'high') return val;
  return 'medium';
}

// ============================================================
// 🔥 Model Capabilities
// ============================================================

export type ModelApi = 'chat-completions' | 'responses';
export type ModelPurpose = 'advanced-analysis' | 'code-analysis' | 'fallback' | 'legacy';
export type TokenParam = 'max_tokens' | 'max_completion_tokens' | 'max_output_tokens';

export interface ModelCapability {
  model: string;
  api: ModelApi;
  purpose: ModelPurpose;
  supportsReasoning: boolean;
  supportsTemperature: boolean;
  supportsTopP: boolean;
  supportsFrequencyPenalty: boolean;
  supportsPresencePenalty: boolean;
  tokenParam: TokenParam;
  defaultMaxTokens: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
}

// ============================================================
// 🔥 Model Registry (با مدل‌های موجود)
// ============================================================

export const LLM_MODELS = {
  // ===== مدل‌های موجود برای Advanced =====
  'gpt-4o': {
    model: getEnv('OPENAI_ADVANCED_MODEL', 'gpt-4o'),
    api: 'chat-completions',
    purpose: 'advanced-analysis',
    supportsReasoning: false,
    supportsTemperature: true,
    supportsTopP: true,
    supportsFrequencyPenalty: true,
    supportsPresencePenalty: true,
    tokenParam: 'max_completion_tokens',
    defaultMaxTokens: getEnvNumber('OPENAI_ADVANCED_MAX_OUTPUT_TOKENS', 12000),
  },

  'gpt-4-turbo': {
    model: getEnv('OPENAI_CODE_MODEL', 'gpt-4-turbo'),
    api: 'chat-completions',
    purpose: 'code-analysis',
    supportsReasoning: false,
    supportsTemperature: true,
    supportsTopP: true,
    supportsFrequencyPenalty: true,
    supportsPresencePenalty: true,
    tokenParam: 'max_completion_tokens',
    defaultMaxTokens: 12000,
  },

  'gpt-4o-mini': {
    model: getEnv('OPENAI_FALLBACK_MODEL', 'gpt-4o-mini'),
    api: 'chat-completions',
    purpose: 'fallback',
    supportsReasoning: false,
    supportsTemperature: true,
    supportsTopP: true,
    supportsFrequencyPenalty: true,
    supportsPresencePenalty: true,
    tokenParam: 'max_completion_tokens',
    defaultMaxTokens: 8000,
  },

  // ===== مدل Legacy (برای Fallback نهایی) =====
  'legacy-stable': {
    model: getEnv('OPENAI_LEGACY_MODEL', 'gpt-4o-mini'),
    api: 'chat-completions',
    purpose: 'legacy',
    supportsReasoning: false,
    supportsTemperature: true,
    supportsTopP: true,
    supportsFrequencyPenalty: true,
    supportsPresencePenalty: true,
    tokenParam: 'max_completion_tokens',
    defaultMaxTokens: 4000,
  },
} as const;

// ============================================================
// 🔥 Advanced Model Roles
// ============================================================

export const ADVANCED_MODEL_ROLES = {
  primary: 'gpt-4o',
  codeFallback: 'gpt-4-turbo',
  stableFallback: 'gpt-4o-mini',
} as const;

export type AdvancedModelRole = keyof typeof ADVANCED_MODEL_ROLES;

// ============================================================
// 🔥 Helpers
// ============================================================

export function getModelByRole(role: AdvancedModelRole): ModelCapability {
  const key = ADVANCED_MODEL_ROLES[role];
  const model = getModelByKey(key);
  if (!model) {
    throw new Error(`Model "${key}" not found in registry for role "${role}"`);
  }
  return model;
}

// ✅ اصلاح شده: استفاده از type guard برای دسترسی به LLM_MODELS
export function getModelByKey(key: string): ModelCapability | undefined {
  if (key in LLM_MODELS) {
    return LLM_MODELS[key as keyof typeof LLM_MODELS];
  }
  return undefined;
}

export function getModelKeys(): string[] {
  return Object.keys(LLM_MODELS);
}

export function getAvailableModelKeys(): string[] {
  // مدل‌هایی که واقعاً در دسترس هستند (برای Production)
  // فعلاً همه مدل‌های ثبت‌شده را برمی‌گردانیم
  return getModelKeys();
}