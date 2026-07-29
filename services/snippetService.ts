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
  line_explanations?: any;
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

    const response = await fetch(`/api/update-snippet/${slug}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
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