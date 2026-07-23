// app/api/metrics/route.ts

import { NextResponse } from 'next/server';
import { getMetrics, generateReport } from '@/lib/monitoring';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/metrics
 * دریافت متریک‌های سیستم (هزینه، زمان پاسخ، کش، وضعیت پایپلاین)
 */
export async function GET() {
  try {
    const metrics = getMetrics();
    const report = generateReport();

    return NextResponse.json({
      success: true,
      metrics,
      report,
      count: metrics.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[Metrics API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch metrics',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/metrics
 * پاک کردن متریک‌ها (برای مدیریت)
 */
export async function DELETE() {
  try {
    const { clearMetrics } = await import('@/lib/monitoring');
    clearMetrics();
    return NextResponse.json({
      success: true,
      message: 'Metrics cleared',
    });
  } catch (error) {
    logger.error('[Metrics API] Delete error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear metrics',
      },
      { status: 500 }
    );
  }
}