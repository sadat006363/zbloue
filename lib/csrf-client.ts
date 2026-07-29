// lib/csrf-client.ts
export async function getCsrfToken(): Promise<string> {
  try {
    const response = await fetch('/api/csrf-token');
    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('CSRF token fetch failed:', error);
    return '';
  }
}