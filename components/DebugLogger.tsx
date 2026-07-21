// ============================================================
// 📁 فایل: components/DebugLogger.tsx
// ============================================================

'use client';

import { useEffect } from 'react';

interface DebugLoggerProps {
  data: {
    fullAnalysisExists: boolean;
    findings: any;
    scorecard_new: any;
    verdict: any;
    execution_overview: any;
    [key: string]: any;
  };
}

export default function DebugLogger({ data }: DebugLoggerProps) {
  useEffect(() => {
    console.log('🔍 ===== DEBUG LOGGER START =====');
    console.log('🔍 fullAnalysisExists:', data.fullAnalysisExists);
    console.log('🔍 findings:', data.findings);
    console.log('🔍 scorecard_new:', data.scorecard_new);
    console.log('🔍 verdict:', data.verdict);
    console.log('🔍 execution_overview:', data.execution_overview);
    console.log('🔍 findings is array?', Array.isArray(data.findings));
    console.log('🔍 findings length:', data.findings?.length || 0);
    console.log('🔍 scorecard_new is object?', data.scorecard_new !== null && typeof data.scorecard_new === 'object');
    console.log('🔍 verdict is object?', data.verdict !== null && typeof data.verdict === 'object');
    console.log('🔍 execution_overview is object?', data.execution_overview !== null && typeof data.execution_overview === 'object');
    console.log('🔍 All keys in data:', Object.keys(data));
    if (Array.isArray(data.findings) && data.findings.length > 0) {
      console.log(`🔍 findings has ${data.findings.length} item(s)`);
      console.log('🔍 First finding:', data.findings[0]);
    }
    if (data.scorecard_new && typeof data.scorecard_new === 'object') {
      console.log('🔍 scorecard_new keys:', Object.keys(data.scorecard_new));
    }
    if (data.verdict && typeof data.verdict === 'object') {
      console.log('🔍 verdict.status:', data.verdict.status);
      console.log('🔍 verdict.explanation:', data.verdict.explanation);
    }
    console.log('🔍 ===== DEBUG LOGGER END =====');
  }, [data]);

  return null;
}