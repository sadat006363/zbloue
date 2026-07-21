// lib/redis.ts

import { Redis } from '@upstash/redis';

// ============================================================
// 🔥 کلاینت Redis با fallback برای محیط توسعه
// ============================================================

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redisClient: Redis | null = null;

if (redisUrl && redisToken) {
  redisClient = new Redis({
    url: redisUrl,
    token: redisToken,
  });
  console.log('✅ Redis client initialized');
} else {
  console.warn('⚠️ Redis credentials not found. Rate limiting will use in-memory fallback.');
}

export const redis = redisClient;

/**
 * بررسی اینکه Redis در دسترس است یا خیر
 */
export const isRedisAvailable = (): boolean => {
  return redis !== null;
};