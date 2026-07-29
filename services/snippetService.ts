// services/snippetService.ts

import { Snippet, CreateSnippetResponse } from '@/types';

export interface SaveSnippetData {
  code: string;
  language: string;
  username?: string | null;
  github_username?: string | null;
  avatar_url?: string | null;
  audit_result: any;
  csrfToken?: string;
}

export interface UpdateSnippetData {
  username?: string | null;
  github_username?: string | null;
  avatar_url?: string | null;
  audit_result?: any;
  line_explanations?: any; // ← این فیلد دیگر به دیتابیس ارسال نمی‌شود، فقط برای پردازش داخلی
  generated_prompt?: string | null;
  csrfToken?: string;
}

export const snippetService = {
  async save(data: SaveSnippetData): Promise<CreateSnippetResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (data.csrfToken) {
      headers['x-csrf-token'] = data.csrfToken;
    }

    const payload = {
      code: data.code,
      language: data.language,
      username: data.username ?? null,
      github_username: data.github_username ?? null,
      avatar_url: data.avatar_url ?? null,
      audit_result: data.audit_result,
    };

    const response = await fetch('/api/create-snippet', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save snippet');
    }
    return result;
  },

  async update(slug: string, data: UpdateSnippetData): Promise<Snippet> {
    const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    };

    if (data.csrfToken) {
      headers['x-csrf-token'] = data.csrfToken;
    }

    // 🔥 آماده‌سازی payload برای ارسال به سرور
    const payload: any = {};

    // فیلدهای ساده
    if (data.username !== undefined) payload.username = data.username;
    if (data.github_username !== undefined) payload.github_username = data.github_username;
    if (data.avatar_url !== undefined) payload.avatar_url = data.avatar_url;
    if (data.generated_prompt !== undefined) payload.generated_prompt = data.generated_prompt;

    // 🔥 line_explanations را داخل audit_result ذخیره می‌کنیم
    if (data.line_explanations !== undefined) {
      // ابتدا audit_result فعلی را دریافت می‌کنیم
      const currentSnippet = await snippetService.getBySlug(slug);
      if (currentSnippet) {
        const currentAudit = currentSnippet.audit_result || {};
        payload.audit_result = {
          ...currentAudit,
          lineExplanations: data.line_explanations, // ← ذخیره در audit_result
        };
      } else {
        // اگر اسنیپت پیدا نشد، فقط خط‌توضیحات را ذخیره کن
        payload.audit_result = {
          lineExplanations: data.line_explanations,
        };
      }
    }

    // اگر audit_result مستقیم ارسال شده باشد
    if (data.audit_result !== undefined) {
      payload.audit_result = data.audit_result;
    }

    const response = await fetch(`/api/update-snippet/${slug}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to update snippet');
    }
    return result.data;
  },

  async getBySlug(slug: string): Promise<Snippet | null> {
    const response = await fetch(`/api/snippet/${slug}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch snippet');
    }
    return response.json();
  },
};