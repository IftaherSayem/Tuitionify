// Minimal in-memory rate limiter — no external dependency.
//
// ⚠ SERVERLESS LIMITATION: Each Vercel function instance keeps its own counters,
// so these limits are per-instance NOT global. Cold starts reset the map. This
// protects against accidental loops and basic abuse, but a determined attacker
// can bypass limits by triggering fresh instances.
//
// For production-grade rate limiting on Vercel serverless, use:
// - Vercel Edge Config + KV for shared state across instances
// - Upstash Redis (serverless-native)
// - Vercel's built-in rate limiting (if available on your plan)
// - A dedicated rate-limit service (e.g., Unkey, Arcjet)

const buckets = new Map();

function clientKey(req) {
  // Prefer the authenticated user, then Vercel's forwarded client IP.
  if (req.dbUser?._id) return `u:${req.dbUser._id}`;
  if (req.firebaseUser?.uid) return `f:${req.firebaseUser.uid}`;
  const fwd = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim();
  return `ip:${ip || req.ip || 'unknown'}`;
}

// Drop expired buckets so the map cannot grow without bound.
function sweep(now) {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

let lastSweep = 0;

export function rateLimit({ windowMs = 60_000, max = 60, name = 'default' } = {}) {
  return (req, res, next) => {
    const now = Date.now();

    if (now - lastSweep > windowMs) {
      sweep(now);
      lastSweep = now;
    }

    const key = `${name}:${clientKey(req)}`;
    const entry = buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        message: `Too many requests. Please try again in ${retryAfter}s.`,
      });
    }
    next();
  };
}
