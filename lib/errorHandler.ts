// lib/errorHandler.ts

import { NextRequest, NextResponse } from 'next/server';
import logger from './logger';
import { getClientIP } from './rateLimiter';

// ============================================================
// 🔥 تایپ‌های خطا
// ============================================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  severity?: ErrorSeverity;
  context?: Record<string, unknown>;
  isOperational?: boolean;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

// ============================================================
// 🔥 کلاس خطای سفارشی
// ============================================================

export class AppErrorClass extends Error implements AppError {
  public readonly code?: string;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    options?: {
      code?: string;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
      isOperational?: boolean;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = options?.code;
    this.severity = options?.severity || 'medium';
    this.context = options?.context;
    this.isOperational = options?.isOperational ?? true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================
// 🔥 خطاهای رایج
// ============================================================

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  AI_ERROR: 'AI_ERROR',
  AI_TIMEOUT: 'AI_TIMEOUT',
  STORAGE_ERROR: 'STORAGE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

// ============================================================
// 🔥 توابع کمکی برای ایجاد خطاهای استاندارد
// ============================================================

export function createValidationError(
  message: string,
  context?: Record<string, unknown>
): AppErrorClass {
  return new AppErrorClass(message, 400, {
    code: ErrorCodes.VALIDATION_ERROR,
    severity: 'medium',
    context,
  });
}

export function createNotFoundError(
  resource: string,
  id?: string
): AppErrorClass {
  const message = id ? `${resource} with id "${id}" not found` : `${resource} not found`;
  return new AppErrorClass(message, 404, {
    code: ErrorCodes.NOT_FOUND,
    severity: 'low',
    context: { resource, id },
  });
}

export function createUnauthorizedError(
  message: string = 'Unauthorized'
): AppErrorClass {
  return new AppErrorClass(message, 401, {
    code: ErrorCodes.UNAUTHORIZED,
    severity: 'high',
  });
}

export function createRateLimitError(
  message: string = 'Too many requests'
): AppErrorClass {
  return new AppErrorClass(message, 429, {
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
    severity: 'medium',
  });
}

export function createAIError(
  message: string,
  context?: Record<string, unknown>
): AppErrorClass {
  return new AppErrorClass(message, 500, {
    code: ErrorCodes.AI_ERROR,
    severity: 'high',
    context,
  });
}

export function createDatabaseError(
  message: string,
  context?: Record<string, unknown>
): AppErrorClass {
  return new AppErrorClass(message, 500, {
    code: ErrorCodes.DATABASE_ERROR,
    severity: 'critical',
    context,
  });
}

// ============================================================
// 🔥 تابع اصلی مدیریت خطا (برگشت‌دهی Response)
// ============================================================

export function handleError(error: unknown): {
  statusCode: number;
  response: ErrorResponse;
  logLevel: 'info' | 'warn' | 'error';
} {
  if (error instanceof AppErrorClass) {
    const statusCode = error.statusCode || 500;
    const response: ErrorResponse = {
      success: false,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    };
    if (process.env.NODE_ENV === 'development' && error.context) {
      response.details = error.context;
    }
    let logLevel: 'info' | 'warn' | 'error' = 'error';
    if (error.severity === 'low') logLevel = 'info';
    else if (error.severity === 'medium') logLevel = 'warn';
    else logLevel = 'error';
    return { statusCode, response, logLevel };
  }

  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return {
        statusCode: 504,
        response: {
          success: false,
          error: 'Request timed out. Please try again.',
          code: 'TIMEOUT_ERROR',
          timestamp: new Date().toISOString(),
        },
        logLevel: 'warn',
      };
    }
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        statusCode: 503,
        response: {
          success: false,
          error: 'Network error. Please check your connection.',
          code: 'NETWORK_ERROR',
          timestamp: new Date().toISOString(),
        },
        logLevel: 'warn',
      };
    }
    return {
      statusCode: 500,
      response: {
        success: false,
        error: process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message,
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { details: error.stack }),
      },
      logLevel: 'error',
    };
  }

  return {
    statusCode: 500,
    response: {
      success: false,
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
    },
    logLevel: 'error',
  };
}

// ============================================================
// 🔥 تابع کمکی برای NextResponse
// ============================================================

export function createErrorResponse(error: unknown): NextResponse {
  const { statusCode, response, logLevel } = handleError(error);
  const logMessage = `[API Error] ${response.code || 'UNKNOWN'}: ${response.error}`;
  if (logLevel === 'error') {
    logger.error(logMessage, error instanceof Error ? error : undefined);
  } else if (logLevel === 'warn') {
    logger.warn(logMessage);
  } else {
    logger.info(logMessage);
  }
  return NextResponse.json(response, { status: statusCode });
}

// ============================================================
// 🔥 تابع لاگ خطا
// ============================================================

export function logError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const { logLevel, response } = handleError(error);
  const logData = {
    ...response,
    context,
    ...(error instanceof Error && { stack: error.stack }),
  };
  if (logLevel === 'error') {
    logger.error('[Error]', logData);
  } else if (logLevel === 'warn') {
    logger.warn('[Error]', logData);
  } else {
    logger.info('[Error]', logData);
  }
}

// ============================================================
// 🔥 Wrapper با قابلیت برگشت Response (برای Streaming)
// ============================================================

export function withErrorHandler(
  handler: (req: NextRequest, ...args: any[]) => Promise<Response>
): (req: NextRequest, ...args: any[]) => Promise<Response> {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}

export function withErrorHandlerAndLog(
  handler: (req: NextRequest, ...args: any[]) => Promise<Response>
): (req: NextRequest, ...args: any[]) => Promise<Response> {
  return async (req: NextRequest, ...args: any[]) => {
    const ip = getClientIP(req);
    try {
      return await handler(req, ...args);
    } catch (error) {
      logError(error, { ip, path: req.nextUrl.pathname });
      return createErrorResponse(error);
    }
  };
}