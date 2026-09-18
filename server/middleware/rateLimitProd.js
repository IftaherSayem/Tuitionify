// Production-grade rate limiter using Upstash Redis for shared state across
// Vercel serverless instances. Falls back to in-memory limiter if Redis is
// not configured (local dev).

import { Redis } from '@upstash/redis';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// In-memory fallback for local dev (same as existing rateLimit.js)
const memoryBuckets = new Map();

function clientKey(req) {
  if (req.dbUser?._id) return `u:${req.dbUser._id}`;
  if (req.firebaseUser?.uid) return `f:${req.firebaseUser.uid}`;
  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim();
  return `ip:${ip || req.ip || 'unknown'}`;
}

function sweepMemory(now, windowMs) {
  for (const [key, entry] of memoryBuckets) {
    if (entry.resetAt <= now) memoryBuckets.delete(key);
  }
}

let lastSweep = 0;

// Memory-based fallback (used when Redis is not configured)
async function rateLimitMemory(key, windowMs, max) {
  const now = Date.now();
  if (now - lastSweep > windowMs) {
    sweepMemory(now, windowMs);
    lastSweep = now;
  }

  const entry = memoryBuckets.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }

  entry.count += 1;
  if (entry.count > max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

// Redis-based rate limiting with sliding window
async function rateLimitRedis(key, windowMs, max) {
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis sorted set with timestamps as scores
    const pipeline = redis.pipeline();
    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    // Count current requests in window
    pipeline.zcard(key);
    // Add current request
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    // Set expiry on the key
    pipeline.expire(key, Math.ceil(windowMs / 1000) + 1);

    const results = await pipeline.exec();
    const count = results[1] + 1; // Count before + new request

    if (count > max) {
      // Remove the request we just added since it's over limit
      await redis.zremrangebyscore(key, now, now);
      return { allowed: false, remaining: 0, resetAt: now + windowMs };
    }

    return { allowed: true, remaining: max - count, resetAt: now + windowMs };
  } catch (err) {
    console.error('Redis rate limit error, allowing request:', err.message);
    // Fail open — allow the request if Redis is down
    return { allowed: true, remaining: max, resetAt: now + windowMs };
  }
}

export function rateLimit({ windowMs = 60_000, max = 60, name = 'default' } = {}) {
  return async (req, res, next) => {
    const key = `rl:${name}:${clientKey(req)}`;

    const result = redis
      ? await rateLimitRedis(key, windowMs, max)
      : await rateLimitMemory(key, windowMs, max);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));
      return res.status(429).json({
        message: `Too many requests. Please try again in ${retryAfter}s.`,
      });
    }

    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(result.remaining));
    res.set('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));
    next();
  };
}
