import { Router } from 'express';
import { verifyToken, loadUser } from '../middleware/auth.js';

const router = Router();

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// POST /api/uploads/photo — proxies an image to imgbb using the server-side
// key. The key must never reach the client: anything in a VITE_* var is
// inlined into the public JS bundle and can be extracted from it.
router.post('/photo', verifyToken, loadUser, async (req, res, next) => {
  try {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: 'Image uploads are not configured on the server' });
    }

    const { image } = req.body || {};
    if (typeof image !== 'string' || !image) {
      return res.status(400).json({ message: 'image (base64) is required' });
    }

    // Reject oversized payloads before spending an upstream call. base64
    // inflates by ~4/3, so compare against the decoded size.
    if (Math.floor((image.length * 3) / 4) > MAX_SIZE) {
      return res.status(413).json({ message: 'Image must be 5 MB or smaller' });
    }

    const form = new URLSearchParams();
    form.append('image', image);

    const upstream = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: form,
    });
    const data = await upstream.json();

    if (!upstream.ok || !data.success) {
      return res.status(502).json({ message: data?.error?.message || 'Upload failed' });
    }

    res.json({ url: data.data.display_url });
  } catch (err) {
    next(err);
  }
});

export default router;
