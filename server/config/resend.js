import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn('⚠ Resend API key not configured — set RESEND_API_KEY in server environment to enable custom emails.');
}

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const DEFAULT_SENDER =
  process.env.RESEND_FROM || 'Tuitionify <noreply@tuitionify.publicvm.com>';
