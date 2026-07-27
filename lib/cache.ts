// lib/cache.ts

import { redis, isRedisAvailable } from './redis';
import logger from './logger';

/**
 * کش توزیع‌شده با Redis و Fallback به In-Memory
 */
class DistributedCache {
  private memoryStore = new Map<string, { data: unknown; timestamp: number }>();
  private defaultTtlSeconds: number;

  constructor(ttlSeconds: number = 86400) {
    // 24 ساعت پیش‌فرض
    this.defaultTtlSeconds = ttlSeconds;
  }

  /**
   * تولید کلید یکتا با هش
   */
  private getKey(key: string): string {
    return `cache:${key}`;
  }

  /**
   * ذخیره‌سازی در کش
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const fullKey = this.getKey(key);
    const ttl = ttlSeconds || this.defaultTtlSeconds;

    try {
      // ===== تلاش برای ذخیره در Redis =====
      if (isRedisAvailable() && redis) {
        await redis.set(fullKey, value, { ex: ttl });
        logger.debug('[Cache] Redis SET successful', { key: fullKey, ttl });
        return;
      }
    } catch (error) {
      logger.warn('[Cache] Redis SET failed, falling back to memory:', error);
    }

    // ===== Fallback: In-Memory =====
    this.memoryStore.set(fullKey, {
      data: value,
      timestamp: Date.now(),
    });
    logger.debug('[Cache] Memory SET successful', { key: fullKey });
  }

  /**
   * دریافت از کش
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getKey(key);

    try {
      // ===== تلاش برای دریافت از Redis =====
      if (isRedisAvailable() && redis) {
        const data = await redis.get<T>(fullKey);
        if (data !== null && data !== undefined) {
          logger.debug('[Cache] Redis GET hit', { key: fullKey });
          return data;
        }
        logger.debug('[Cache] Redis GET miss', { key: fullKey });
        // اگر در Redis نبود، از Memory چک می‌کنیم
      }
    } catch (error) {
      logger.warn('[Cache] Redis GET failed, falling back to memory:', error);
    }

    // ===== Fallback: In-Memory =====
    const entry = this.memoryStore.get(fullKey);
    if (!entry) {
      logger.debug('[Cache] Memory GET miss', { key: fullKey });
      return null;
    }

    const age = Date.now() - entry.timestamp;
    const ttlMs = this.defaultTtlSeconds * 1000;

    if (age > ttlMs) {
      this.memoryStore.delete(fullKey);
      logger.debug('[Cache] Memory GET expired', { key: fullKey });
      return null;
    }

    logger.debug('[Cache] Memory GET hit', { key: fullKey });
    return entry.data as T;
  }

  /**
   * بررسی وجود کلید در کش
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * حذف یک کلید از کش
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.getKey(key);

    try {
      if (isRedisAvailable() && redis) {
        await redis.del(fullKey);
        logger.debug('[Cache] Redis DELETE', { key: fullKey });
      }
    } catch (error) {
      logger.warn('[Cache] Redis DELETE failed:', error);
    }

    this.memoryStore.delete(fullKey);
  }

  /**
   * پاک کردن تمام کش
   */
  async clear(): Promise<void> {
    try {
      if (isRedisAvailable() && redis) {
        // ⚠️ این کار تمام کلیدهای cache: را پاک می‌کند
        const keys = await redis.keys('cache:*');
        if (keys.length > 0) {
          await redis.del(...keys);
          logger.debug('[Cache] Redis CLEAR all cache keys');
        }
      }
    } catch (error) {
      logger.warn('[Cache] Redis CLEAR failed:', error);
    }

    this.memoryStore.clear();
  }

  /**
   * پاکسازی کش‌های منقضی‌شده (فقط برای Memory)
   */
  cleanup(): void {
    const now = Date.now();
    const ttlMs = this.defaultTtlSeconds * 1000;
    for (const [key, entry] of this.memoryStore) {
      if (now - entry.timestamp > ttlMs) {
        this.memoryStore.delete(key);
      }
    }
  }
}

// ============================================================
// 🔥 نمونه Singleton
// ============================================================

export const cache = new DistributedCache(86400); // 24 ساعت

// ============================================================
// 🔥 تابع کمکی برای تولید کلید کش
// ============================================================

import crypto from 'crypto';

export function getCacheKey(
  code: string,
  language: string,
  mode: string,
  extra?: string
): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${code}|${language}|${mode}|${extra || ''}`)
    .digest('hex')
    .slice(0, 16);

  return `${mode}:${language}:${hash}`;
}