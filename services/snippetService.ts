// services/snippetService.ts

import { Snippet, CreateSnippetResponse } from '@/types';

/**
 * داده‌های مورد نیاز برای ذخیره‌سازی Snippet جدید
 */
export interface SaveSnippetData {
  code: string;
  language: string;
  username?: string | null;
  github_username?: string | null;
  avatar_url?: string | null;
  audit_result: any;
}

/**
 * داده‌های قابل به‌روزرسانی برای Snippet
 */
export interface UpdateSnippetData {
  username?: string | null;
  github_username?: string | null;
  avatar_url?: string | null;
  audit_result?: any;
  line_explanations?: any;
  generated_prompt?: string | null;
}

/**
 * سرویس مدیریت Snippetها
 */
export const snippetService = {
  /**
   * ذخیره‌سازی یک Snippet جدید در دیتابیس
   */
  async save(data: SaveSnippetData): Promise<CreateSnippetResponse> {
    console.log('🔍 [snippetService.save] ===== START =====');
    console.log('🔍 [snippetService.save] audit_result keys:', Object.keys(data.audit_result || {}));
    console.log('🔍 [snippetService.save] Full data keys:', Object.keys(data));
    console.log('🔍 [snippetService.save] ===== END =====');

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save snippet');
    }
    return result;
  },

  /**
   * به‌روزرسانی یک Snippet موجود با استفاده از slug
   */
  async update(slug: string, data: UpdateSnippetData): Promise<Snippet> {
    const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
    const response = await fetch(`/api/update-snippet/${slug}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to update snippet');
    }
    return result.data;
  },

  /**
   * دریافت یک Snippet با slug (در صورت نیاز در سمت کلاینت)
   */
  async getBySlug(slug: string): Promise<Snippet | null> {
    const response = await fetch(`/api/snippet/${slug}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch snippet');
    }
    return response.json();
  },
};