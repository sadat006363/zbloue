// lib/analysis/dependencies.ts

import { callOpenAI } from '@/lib/openaiClient';
import logger from '@/lib/logger';
import { ANALYSIS_CONFIG, SIGNAL_WEIGHTS } from './analysis.config';

export interface AnalysisDependencies {
  callAI: typeof callOpenAI;
  logger: typeof logger;
  config: typeof ANALYSIS_CONFIG;
  signalWeights: typeof SIGNAL_WEIGHTS;
}

export const defaultDependencies: AnalysisDependencies = {
  callAI: callOpenAI,
  logger: logger,
  config: ANALYSIS_CONFIG,
  signalWeights: SIGNAL_WEIGHTS,
};