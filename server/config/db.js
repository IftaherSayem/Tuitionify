import mongoose from 'mongoose';

// Cache the connection across serverless invocations (Vercel reuses the
// process between requests, so we must not reconnect every time).
let cached = null;

export function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing');
  if (cached) return cached;
  cached = mongoose
    .connect(uri)
    .then((m) => {
      console.log('✓ MongoDB Atlas connected');
      return m;
    })
    .catch((err) => {
      cached = null; // allow retry on next request
      throw err;
    });
  return cached;
}
