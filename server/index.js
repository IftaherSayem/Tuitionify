import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { connectDB } from './config/db.js';
import { initFirebase } from './config/firebase.js';

import userRoutes from './routes/users.js';
import tuitionRoutes from './routes/tuitions.js';
import applicationRoutes from './routes/applications.js';
import reviewRoutes from './routes/reviews.js';
import contactRoutes from './routes/contact.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import bookmarkRoutes from './routes/bookmarks.js';
import tutorBookmarkRoutes from './routes/tutorBookmarks.js';
import uploadRoutes from './routes/uploads.js';
import { rateLimit } from './middleware/rateLimit.js';

const app = express();

initFirebase();

const clientUrl = (process.env.CLIENT_URL || '*').replace(/\/+$/, '');
if (clientUrl === '*' && process.env.NODE_ENV === 'production') {
  console.warn('⚠ CLIENT_URL is not set — CORS is open to every origin. Set it to your client domain.');
}
app.use(cors({ origin: clientUrl }));

// Base64 photo uploads need a large body, but only on that one route —
// every other endpoint keeps a small limit so a single request cannot
// tie up memory.
app.use('/api/uploads', express.json({ limit: '4.5mb' }));
app.use(express.json({ limit: '100kb' }));

// Blanket limit as a backstop; individual write routes set tighter ones.
app.use('/api', rateLimit({ windowMs: 60_000, max: 200, name: 'global' }));

// Ensure the DB is connected before handling any request (serverless-safe).
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'tuitionify-api' }));

app.use('/api/users', userRoutes);
app.use('/api/tuitions', tuitionRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/contact-requests', contactRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/tutor-bookmarks', tutorBookmarkRoutes);
app.use('/api/uploads', uploadRoutes);

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);

  // A malformed :id reaches Mongoose as a CastError — that's a bad request,
  // not a server fault, and the raw message leaks schema internals.
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid id' });
  }
  if (err.name === 'ValidationError') {
    // Name the offending fields — with length/range caps on the models, a bare
    // "Invalid request data" leaves the user with no idea what to shorten.
    const fields = Object.keys(err.errors || {});
    return res.status(400).json({
      message: fields.length
        ? `Invalid request data: ${fields.join(', ')}`
        : 'Invalid request data',
    });
  }
  // Body larger than the configured limit.
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body too large' });
  }

  const status = err.status || 500;
  // Don't echo internal error text to clients in production.
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Server error'
    : err.message || 'Server error';
  res.status(status).json({ message });
});

// Run a real listener only outside Vercel (local dev). On Vercel the app
// is imported as a serverless handler instead.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  connectDB().catch((e) => console.error('✗ Mongo:', e.message));
  app.listen(PORT, () => console.log(`✓ Tuitionify API running on http://localhost:${PORT}`));
}

export default app;
