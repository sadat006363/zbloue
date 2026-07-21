// services/snippetService.ts

import { Snippet, CreateSnippetResponse } from '@/types';

interface SaveSnippetData {
  code: string;
  language: string;
  card_title?: string;
  key_concept?: string;
  what_this_code_does?: string;
  debug_analysis?: string;
  optimization?: string;
  linkedin_post?: string;
  username?: string | null;
  github_username?: string | null;
  avatar_url?: string | null;
  // ... سایر فیلدهای اختیاری
  [key: string]: unknown;
}

export const snippetService = {
  /**
   * ذخیره‌سازی یک Snippet جدید
   */
  async save(data: SaveSnippetData): Promise<CreateSnippetResponse> {
    const response = await fetch('/api/create-snippet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save snippet');
    }
    return result;
  },

  /**
   * به‌روزرسانی یک Snippet موجود
   */
  async update(slug: string, data: Record<string, unknown>): Promise<Snippet> {
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