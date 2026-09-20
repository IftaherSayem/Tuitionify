import { Router } from 'express';
import { admin } from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimitProd.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';
import logger from '../utils/logger.js';

const router = Router();

function getClientUrl() {
  return (process.env.CLIENT_URL || 'https://iiuc-tuitionify.vercel.app').replace(/\/+$/, '');
}

/**
 * POST /api/auth/send-verification
 * Sends a custom branded email verification link via Resend.
 * Requires an authenticated Firebase ID token.
 * Rate-limited: 1 verification email per 60 seconds per user.
 */
router.post(
  '/send-verification',
  verifyToken,
  rateLimit({ windowMs: 60_000, max: 1, name: 'auth-verify-email' }),
  async (req, res, next) => {
    try {
      const { uid, email } = req.firebaseUser;

      if (!email) {
        return res.status(400).json({ message: 'No email address associated with this account' });
      }

      if (!admin.apps.length) {
        return res.status(500).json({ message: 'Firebase Admin is not configured on the server' });
      }

      const userRecord = await admin.auth().getUser(uid);

      if (userRecord.emailVerified) {
        return res.json({
          success: true,
          message: 'Your email address is already verified',
          alreadyVerified: true,
        });
      }

      const clientUrl = getClientUrl();
      let firebaseLink;
      try {
        firebaseLink = await admin.auth().generateEmailVerificationLink(email, {
          url: `${clientUrl}/auth/action`,
        });
      } catch (linkErr) {
        if (linkErr.code === 'auth/unauthorized-continue-uri') {
          console.warn('Continue URL not yet in Firebase Console Authorized Domains, using standard link fallback');
          firebaseLink = await admin.auth().generateEmailVerificationLink(email);
        } else {
          throw linkErr;
        }
      }

      // Point directly to Tuitionify's custom AuthAction page using the secure Firebase action code
      let directActionLink = firebaseLink;
      try {
        const parsed = new URL(firebaseLink);
        const oobCode = parsed.searchParams.get('oobCode');
        const apiKey = parsed.searchParams.get('apiKey');
        const mode = parsed.searchParams.get('mode') || 'verifyEmail';
        if (oobCode) {
          directActionLink = `${clientUrl}/auth/action?mode=${mode}&oobCode=${encodeURIComponent(oobCode)}${apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : ''}`;
        }
      } catch {
        // Fallback to standard firebaseLink
      }

      await sendVerificationEmail({
        to: email,
        name: userRecord.displayName || req.firebaseUser.name || 'Tuitionify User',
        link: directActionLink,
      });

      res.json({
        success: true,
        message: 'Verification email sent successfully',
      });
    } catch (err) {
      logger.error('Failed to send verification email', {
        uid: req.firebaseUser?.uid,
        email: req.firebaseUser?.email,
        error: err.message,
      });
      res.status(500).json({
        message: err.message || 'Failed to send verification email',
      });
    }
  },
);

/**
 * POST /api/auth/send-password-reset
 * Sends a custom branded password reset link via Resend.
 * Public endpoint, rate-limited: 5 requests per 15 minutes.
 * Generic response always returned to prevent email enumeration.
 */
router.post(
  '/send-password-reset',
  rateLimit({ windowMs: 900_000, max: 5, name: 'auth-password-reset' }),
  async (req, res, next) => {
    const genericSuccessMessage =
      'If an account exists for this email, a password reset link has been sent.';

    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

      // Basic syntax validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
      }

      if (!admin.apps.length) {
        return res.status(500).json({ message: 'Firebase Admin is not configured on the server' });
      }

      const clientUrl = getClientUrl();

      try {
        const userRecord = await admin.auth().getUserByEmail(email);

        const firebaseLink = await admin.auth().generatePasswordResetLink(email, {
          url: `${clientUrl}/auth/action`,
        });

        let directActionLink = firebaseLink;
        try {
          const parsed = new URL(firebaseLink);
          const oobCode = parsed.searchParams.get('oobCode');
          const apiKey = parsed.searchParams.get('apiKey');
          const mode = parsed.searchParams.get('mode') || 'resetPassword';
          if (oobCode) {
            directActionLink = `${clientUrl}/auth/action?mode=${mode}&oobCode=${encodeURIComponent(oobCode)}${apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : ''}`;
          }
        } catch {
          // Fallback to standard firebaseLink
        }

        await sendPasswordResetEmail({
          to: email,
          name: userRecord.displayName || 'Tuitionify User',
          link: directActionLink,
        });
      } catch (err) {
        // Specifically catch user-not-found so we don't disclose whether email exists
        if (err.code === 'auth/user-not-found') {
          // Do not send email, proceed to return generic success
          return res.json({
            success: true,
            message: genericSuccessMessage,
          });
        }

        logger.error('Password reset generation/delivery error', {
          email,
          code: err.code,
          error: err.message,
        });

        // For internal errors like missing Resend API key or network failure, pass to error handler
        if (err.message?.includes('Resend is not configured')) {
          return res.status(500).json({ message: 'Email service is currently unavailable' });
        }
      }

      return res.json({
        success: true,
        message: genericSuccessMessage,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
