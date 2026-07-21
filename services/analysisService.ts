// services/analysisService.ts

import { GenerateResponse, GenerateRequest, LineExplanation } from '@/types';

interface GenerateOptions {
  code: string;
  language: string;
  mode: 'simple' | 'medium' | 'advanced';
  signal?: AbortSignal;
}

export const analysisService = {
  /**
   * تولید تحلیل کد
   */
  async generate({ code, language, mode, signal }: GenerateOptions): Promise<GenerateResponse> {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, mode }),
      signal,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'AI generation failed');
    }
    return data;
  },

  /**
   * تولید توضیحات خط به خط
   */
  async explainLineByLine(code: string, language: string): Promise<LineExplanation[]> {
    const response = await fetch('/api/explain-line-by-line', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate explanations');
    }
    return data.explanations || [];
  },

  /**
   * تولید پرامپت از کد
   */
  async generatePrompt(code: string, language: string, mode: string): Promise<string> {
    const response = await fetch('/api/generate-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, mode }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate prompt');
    }
    return data.prompt || '';
  },

  /**
   * تبدیل کد به زبان دیگر
   */
  async convertCode(code: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
    const response = await fetch('/api/convert-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, sourceLanguage, targetLanguage }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Conversion failed');
    }
    return data.convertedCode;
  },
};