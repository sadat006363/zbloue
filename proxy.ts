import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ===== Rate Limiting Configuration =====
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const LIMIT = 20; // 20 requests
const WINDOW = 24 * 60 * 60 * 1000; // 24 hours

// Allowed origins for CORS
const allowedOrigins = [
  'https://Zbloue.vercel.app',
  'https://zbloue.vercel.app',
  'http://localhost:3000',
];

// Helper function to get client IP
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return '127.0.0.1';
}

export function proxy(request: NextRequest) {
  // ===== Rate Limiting =====
  // Only for generate and create-snippet APIs
  if (request.nextUrl.pathname.startsWith('/api/generate') || 
      request.nextUrl.pathname.startsWith('/api/create-snippet')) {
    
    // Get user IP
    const ip = getClientIP(request);
    const now = Date.now();
    const record = rateLimit.get(ip);

    // If no record or time window expired
    if (!record || now > record.resetTime) {
      rateLimit.set(ip, { count: 1, resetTime: now + WINDOW });
      return NextResponse.next();
    }

    // If rate limit exceeded
    if (record.count >= LIMIT) {
      return new NextResponse(
        JSON.stringify({ 
          error: `Too many requests. Maximum ${LIMIT} requests per 24 hours. Please try again later.` 
        }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Increment request count
    record.count += 1;
    rateLimit.set(ip, record);
  }

  // ===== CORS (Optional for MVP) =====
  if (process.env.NODE_ENV === 'production') {
    const origin = request.headers.get('origin') || '';
    if (request.nextUrl.pathname.startsWith('/api/') && 
        !allowedOrigins.includes(origin) && 
        !origin.includes('localhost')) {
      // Log only for MVP, don't block
      console.warn(`[CORS] Request from origin: ${origin}`);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};