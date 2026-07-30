import { Router } from 'express';
import { verifyToken, loadUser } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Kept in sync with the client cap. Vercel limits a serverless request body
// to 4.5 MB, and base64 inflates a file by ~4/3, so 3 MB of image data is
// about the largest that fits with headroom.
const MAX_SIZE = 3 * 1024 * 1024;

// POST /api/uploads/photo — proxies an image to imgbb using the server-side
// key. The key must never reach the client: anything in a VITE_* var is
// inlined into the public JS bundle and can be extracted from it.
router.post(
  '/photo',
  verifyToken,
  loadUser,
  rateLimit({ windowMs: 60_000, max: 10, name: 'upload' }),
  async (req, res, next) => {
    try {
      const apiKey = process.env.IMGBB_API_KEY;
      if (!apiKey) {
        console.error('[upload] IMGBB_API_KEY is not set in this environment');
        return res.status(503).json({ message: 'Image uploads are not configured on the server' });
      }

      const { image } = req.body || {};
      if (typeof image !== 'string' || !image) {
        return res.status(400).json({ message: 'image (base64) is required' });
      }

      // Reject oversized payloads before spending an upstream call. base64
      // inflates by ~4/3, so compare against the decoded size.
      if (Math.floor((image.length * 3) / 4) > MAX_SIZE) {
        return res.status(413).json({ message: 'Image must be 3 MB or smaller' });
      }

      const form = new URLSearchParams();
      form.append('image', image);

      let upstream;
      let data;
      try {
        upstream = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: form,
          signal: AbortSignal.timeout(20_000),
        });
        data = await upstream.json().catch(() => null);
      } catch (e) {
        console.error('[upload] could not reach imgbb:', e.message);
        return res.status(504).json({ message: 'Image host is unreachable. Please try again.' });
      }

      if (!upstream.ok || !data?.success) {
        const upstreamMsg = data?.error?.message || `HTTP ${upstream.status}`;
        // Always log the real reason — a generic client message made a revoked
        // key indistinguishable from a bad file during debugging.
        console.error(`[upload] imgbb rejected the request: ${upstreamMsg}`);

        // imgbb reports an invalid/revoked key as a 400 "Invalid API v1 key".
        // That is a server misconfiguration, not something the user can fix.
        if (/invalid api/i.test(upstreamMsg) || upstream.status === 401 || upstream.status === 403) {
          return res.status(503).json({
            message: 'Image uploads are misconfigured on the server (rejected API key).',
          });
        }
        if (upstream.status === 429) {
          return res.status(429).json({ message: 'Image host is rate limiting uploads. Try again shortly.' });
        }
        return res.status(502).json({ message: `Image host rejected the upload: ${upstreamMsg}` });
      }

      const url = data?.data?.display_url;
      if (!url) {
        console.error('[upload] imgbb response missing display_url:', JSON.stringify(data).slice(0, 300));
        return res.status(502).json({ message: 'Image host returned an unexpected response.' });
      }

      res.json({ url });
    } catch (err) {
      next(err);
    }
  },
);

export default router;

