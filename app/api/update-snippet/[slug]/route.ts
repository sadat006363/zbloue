// app/api/update-snippet/[slug]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Snippet } from '@/types';
import { rateLimiter, getClientIP } from '@/lib/rateLimiter';
import logger from '@/lib/logger';
import { withErrorHandlerAndLog } from '@/lib/errorHandler';
import { AdvancedAuditResultSchema } from '@/lib/analysis/schema';
import { withCsrfProtection } from '@/lib/csrf';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const apiSecretKey = process.env.API_SECRET_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

type UpdateSnippetData = Partial<Pick<
  Snippet,
  'username' | 'github_username' | 'avatar_url' | 'audit_result' | 'generated_prompt'
>>;

export const PATCH = withCsrfProtection(
  withErrorHandlerAndLog(
    async (req: NextRequest, { params }: { params: Promise<{ slug: string }> }) => {
      const ip = getClientIP(req);

      const rateLimitResult = await rateLimiter(ip);
      if (!rateLimitResult.allowed) {
        logger.warn(`[update-snippet] Rate limit exceeded for IP ${ip}`);
        return NextResponse.json(
          { error: rateLimitResult.message },
          { status: 429 }
        );
      }

      const apiKey = req.headers.get('x-api-key');

      if (!apiSecretKey) {
        return NextResponse.json(
          { error: 'Server configuration error: API key not set' },
          { status: 500 }
        );
      }

      if (apiKey !== apiSecretKey) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid API key' },
          { status: 401 }
        );
      }

      const { slug } = await params;
      const body = await req.json();

      const updateData: UpdateSnippetData = {};

      // ===== فیلدهای کاربر =====
      if (body.username !== undefined) {
        updateData.username = body.username?.trim().slice(0, 50) || null;
      }
      if (body.github_username !== undefined) {
        updateData.github_username = body.github_username?.trim().slice(0, 50) || null;
      }
      if (body.avatar_url !== undefined) {
        updateData.avatar_url = body.avatar_url || null;
      }

      // ============================================================
      // 🔥 پشتیبانی از به‌روزرسانی audit_result
      // ============================================================
      if (body.audit_result !== undefined) {
        const validated = AdvancedAuditResultSchema.safeParse(body.audit_result);
        if (!validated.success) {
          logger.error('[update-snippet] Invalid audit_result:', validated.error.issues);
          return NextResponse.json(
            { error: 'Invalid audit result structure' },
            { status: 400 }
          );
        }
        updateData.audit_result = validated.data;
      }

      // ============================================================
      // 🔥 پشتیبانی از به‌روزرسانی generated_prompt
      // ============================================================
      if (body.generated_prompt !== undefined) {
        updateData.generated_prompt = body.generated_prompt;
      }

      // ============================================================
      // ❌ line_explanations دیگر فیلد جداگانه نیست، در audit_result ذخیره می‌شود
      // ============================================================
      // اگر line_explanations به صورت جداگانه ارسال شده بود، آن را نادیده می‌گیریم
      // و به کاربر پیام می‌دهیم که از audit_result استفاده کند
      if (body.line_explanations !== undefined) {
        logger.warn('[update-snippet] line_explanations field is deprecated. Please use audit_result.lineExplanations instead.');
        // می‌توانیم به‌جای خطا، آن را داخل audit_result ذخیره کنیم
        // اما برای جلوگیری از سردرگمی، یک خطا برمی‌گردانیم
        return NextResponse.json(
          { 
            error: 'line_explanations field is deprecated. Please use audit_result with lineExplanations field instead.',
            hint: 'Use: { "audit_result": { ...existingAudit, "lineExplanations": [...] } }'
          },
          { status: 400 }
        );
      }

      // ============================================================
      // اگر چیزی برای به‌روزرسانی وجود نداشت
      // ============================================================
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'No fields to update' },
          { status: 400 }
        );
      }

      // ============================================================
      // اجرای به‌روزرسانی در دیتابیس
      // ============================================================
      const { data, error } = await supabaseAdmin
        .from('snippets')
        .update(updateData)
        .eq('slug', slug)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: `Database error: ${error.message}` },
          { status: 500 }
        );
      }

      if (!data) {
        return NextResponse.json(
          { error: 'Snippet not found' },
          { status: 404 }
        );
      }

      logger.info(`[update-snippet] Successfully updated snippet ${slug} (IP ${ip})`);
      return NextResponse.json({
        success: true,
        data,
      });
    }
  )
);