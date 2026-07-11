import { admin } from '../config/firebase.js';
import User from '../models/User.js';

// Verifies the Firebase ID token from the Authorization header and
// attaches the decoded token to req.firebaseUser.
export async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'No auth token provided' });
  }

  try {
    if (!admin.apps.length) {
      return res.status(500).json({ message: 'Firebase Admin not configured on server' });
    }
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded; // { uid, email, name, ... }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Loads the matching Mongo user into req.dbUser. Requires verifyToken first.
export async function loadUser(req, res, next) {
  try {
    const user = await User.findOne({ firebaseUid: req.firebaseUser.uid });
    if (!user) {
      return res.status(404).json({ message: 'User profile not found. Complete registration first.' });
    }
    if (user.restricted) {
      return res.status(403).json({ message: 'Your account has been restricted by an administrator.' });
    }
    req.dbUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Optional auth: if a valid token is present, attach req.firebaseUser and
// req.dbUser; otherwise continue as an anonymous visitor. Never rejects.
// Used by endpoints that show extra data to logged-in users.
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !admin.apps.length) return next();

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded;
    req.dbUser = await User.findOne({ firebaseUid: decoded.uid });
  } catch {
    // ignore bad/expired tokens — treat as anonymous
  }
  next();
}

// Guards a route to a specific role.
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.dbUser || req.dbUser.role !== role) {
      return res.status(403).json({ message: `Only ${role}s can perform this action` });
    }
    next();
  };
}

// Guards admin-only routes. Admins are listed by email in ADMIN_EMAILS
// (comma-separated) in the server .env. Requires verifyToken + loadUser.
export function requireAdmin(req, res, next) {
  const admins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!req.dbUser || !admins.includes(req.dbUser.email.toLowerCase())) {
    return res.status(403).json({ message: 'Admin access only' });
  }
  next();
}
