import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn('⚠ Resend API key not configured — set RESEND_API_KEY in server environment to enable custom emails.');
}

export const resend = apiKey ? new Resend(apiKey) : null;

export const DEFAULT_SENDER =
  process.env.RESEND_FROM || 'Tuitionify <noreply@tuitionify.publicvm.com>';
