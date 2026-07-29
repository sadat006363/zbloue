// services/analysisService.ts

import { LegacyGenerateResponse, LineExplanation, AnalysisMode } from '@/types';

interface GenerateOptions {
  code: string;
  language: string;
  mode: AnalysisMode;
  signal?: AbortSignal;
  csrfToken?: string;
}

export const analysisService = {
  /**
   * Generate code analysis with increased timeout (120 seconds)
   */
  async generate({ code, language, mode, signal, csrfToken }: GenerateOptions): Promise<LegacyGenerateResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code, language, mode }),
        signal: signal || controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI generation failed');
      }
      return data as LegacyGenerateResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },

  /**
   * Generate line-by-line explanations
   */
  async explainLineByLine(code: string, language: string, mode: AnalysisMode): Promise<LineExplanation[]> {
    const response = await fetch('/api/explain-line-by-line', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, mode }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate explanations');
    }
    return data.explanations || [];
  },

  /**
   * Generate prompt from code
   */
  async generatePrompt(code: string, language: string, mode: AnalysisMode): Promise<string> {
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
   * Convert code to another language
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