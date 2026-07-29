// lib/csrf.ts
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// تنظیمات CSRF
// ============================================================

const CSRF_SECRET = process.env.CSRF_SECRET || 'change-this-secret-in-production';
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 ساعت

// ============================================================
// تولید توکن
// ============================================================

export function generateCsrfToken(): string {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(16).toString('hex');
  const data = `${timestamp}:${random}`;
  
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(data)
    .digest('hex');
  
  return `${data}:${signature}`;
}

// ============================================================
// اعتبارسنجی توکن
// ============================================================

export function validateCsrfToken(token: string): boolean {
  if (!token) return false;
  
  try {
    const parts = token.split(':');
    if (parts.length !== 3) return false;
    
    const [timestamp, random, signature] = parts;
    
    // بررسی انقضا
    const time = parseInt(timestamp, 10);
    if (isNaN(time)) return false;
    if (Date.now() - time > CSRF_TOKEN_EXPIRY) return false;
    
    // بررسی امضا
    const data = `${timestamp}:${random}`;
    const expectedSignature = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(data)
      .digest('hex');
    
    return signature === expectedSignature;
  } catch {
    return false;
  }
}

// ============================================================
// Wrapper برای APIهای حساس
// ============================================================

export function withCsrfProtection(handler: Function) {
  return async function(req: NextRequest, ...args: any[]) {
    // فقط برای درخواست‌های غیر-GET
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      const token = req.headers.get('x-csrf-token');
      
      if (!token || !validateCsrfToken(token)) {
        return NextResponse.json(
          { 
            error: 'CSRF token validation failed',
            code: 'CSRF_INVALID'
          },
          { status: 403 }
        );
      }
    }
    
    return handler(req, ...args);
  };
}