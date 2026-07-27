// lib/llm-strategy.ts

import { AdvancedModelRole } from './llm-registry';

export type StrategyType = 'cost-optimized' | 'quality-optimized';

/**
 * دریافت استراتژی فعلی از متغیر محیطی
 * - cost-optimized: استفاده از Groq برای Simple/Medium، OpenAI برای Advanced
 * - quality-optimized: استفاده از OpenAI برای تمام حالت‌ها
 */
export function getStrategy(): StrategyType {
  const strategy = process.env.LLM_STRATEGY || 'cost-optimized';
  console.log(`📊 [LLM Strategy] Current strategy: ${strategy}`);
  if (strategy === 'quality-optimized') {
    console.log('📊 [LLM Strategy] → Using QUALITY-OPTIMIZED (all requests via OpenAI)');
    return 'quality-optimized';
  }
  console.log('📊 [LLM Strategy] → Using COST-OPTIMIZED (Simple/Medium via Groq, Advanced via OpenAI)');
  return 'cost-optimized';
}

/**
 * دریافت Role مناسب برای هر حالت بر اساس استراتژی
 */
export function getRoleForMode(mode: 'simple' | 'medium' | 'advanced'): AdvancedModelRole {
  const strategy = getStrategy();

  if (strategy === 'quality-optimized') {
    // همه حالت‌ها از OpenAI استفاده کنند
    if (mode === 'advanced') {
      console.log(`🎯 [LLM Strategy] Mode: ${mode} → Role: primary (GPT-4o)`);
      return 'primary';
    }
    console.log(`🎯 [LLM Strategy] Mode: ${mode} → Role: codeFallback (GPT-4o-mini)`);
    return 'codeFallback';
  }

  // cost-optimized
  if (mode === 'advanced') {
    console.log(`🎯 [LLM Strategy] Mode: ${mode} → Role: primary (GPT-4o)`);
    return 'primary';
  }

  // Simple و Medium از Groq استفاده کنند
  console.log(`🎯 [LLM Strategy] Mode: ${mode} → Role: costFallback (Groq - Llama/Mixtral)`);
  return 'costFallback';
}