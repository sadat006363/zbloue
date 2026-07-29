// app/api/csrf-token/route.ts
import { NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/csrf';

export async function GET() {
  const token = generateCsrfToken();
  
  const response = NextResponse.json({ token });
  
  // تنظیم کوکی برای بررسی سمت سرور
  response.cookies.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600, // 1 ساعت
  });
  
  return response;
}