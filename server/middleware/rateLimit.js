// Minimal in-memory rate limiter — no external dependency.
//
// Note on serverless: each Vercel instance keeps its own counters, so limits
// are per-instance rather than global. That is enough to stop a single client
// hammering an endpoint in a loop; a shared store (Redis) would be needed for
// strict global limits.

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
