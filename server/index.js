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

const app = express();

initFirebase();

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

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

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

// Run a real listener only outside Vercel (local dev). On Vercel the app
// is imported as a serverless handler instead.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  connectDB().catch((e) => console.error('✗ Mongo:', e.message));
  app.listen(PORT, () => console.log(`✓ Tuitionify API running on http://localhost:${PORT}`));
}

export default app;
