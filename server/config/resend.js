import { Resend } from 'resend';

function sanitizeKey(rawKey) {
  if (!rawKey) return '';
  return String(rawKey)
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
}

const rawApiKey = process.env.RESEND_API_KEY;

if (!rawApiKey) {
  console.warn('⚠ Resend API key not configured — set RESEND_API_KEY in server environment to enable custom emails.');
}

export function getResend() {
  const key = sanitizeKey(process.env.RESEND_API_KEY);
  if (!key) return null;
  return new Resend(key);
}

const initialKey = sanitizeKey(process.env.RESEND_API_KEY);
export const resend = initialKey ? new Resend(initialKey) : null;

export const DEFAULT_SENDER =
  (process.env.RESEND_FROM ? sanitizeKey(process.env.RESEND_FROM) : '') ||
  'Tuitionify <noreply@tuitionify.publicvm.com>';

