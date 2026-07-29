// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================
// تنظیمات CORS
// ============================================================

// لیست دامنه‌های مجاز
const allowedOrigins = [
  'https://zbloue.vercel.app',
  'https://zbloue.vercel.com',
  'http://localhost:3000',
  'http://localhost:3001',
];

// دامنه‌های Wildcard
const allowedWildcardPatterns = [
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*\.vercel\.com$/,
];

function isOriginAllowed(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  for (const pattern of allowedWildcardPatterns) {
    if (pattern.test(origin)) return true;
  }
  return false;
}

// ============================================================
// هدرهای امنیتی
// ============================================================

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://vercel.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://ui-avatars.com https://*.supabase.co https://*.vercel.app",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co https://api.openai.com https://api.anthropic.com https://api.groq.com https://*.upstash.com",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

// ============================================================
// Proxy اصلی (قبلاً middleware)
// ============================================================

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const origin = request.headers.get('origin') || '';
  
  const response = NextResponse.next();

  // ===== CORS برای APIها =====
  if (pathname.startsWith('/api/')) {
    const isAllowed = isOriginAllowed(origin);
    
    if (isAllowed && origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-csrf-token, x-request-id');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Max-Age', '86400');
    }
    
    if (request.method === 'OPTIONS') {
      const preflightResponse = new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
      return preflightResponse;
    }
  }

  // ===== هدرهای امنیتی =====
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.delete('X-Powered-By');

  return response;
}

// ============================================================
// پیکربندی
// ============================================================

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/og-image|fonts).*)',
  ],
};