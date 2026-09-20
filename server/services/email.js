import nodemailer from 'nodemailer';
import { resend, getResend, DEFAULT_SENDER } from '../config/resend.js';

function getGmailTransporter() {
  const user = (process.env.GMAIL_USER || '').trim().replace(/^["']|["']$/g, '');
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').replace(/^["']|["']$/g, '');

  if (!user || !pass) return null;

  return {
    transporter: nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    }),
    user,
  };
}

async function dispatchEmail({ to, subject, html }) {
  const gmailConfig = getGmailTransporter();
  if (gmailConfig) {
    const from = process.env.GMAIL_FROM || `Tuitionify <${gmailConfig.user}>`;
    const info = await gmailConfig.transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    return { success: true, id: info.messageId, provider: 'gmail' };
  }

  // Fallback to Resend
  const client = getResend() || resend;
  if (!client) {
    throw new Error('Email service not configured. Please set GMAIL_USER & GMAIL_APP_PASSWORD, or RESEND_API_KEY in server environment.');
  }

  const { data, error } = await client.emails.send({
    from: DEFAULT_SENDER,
    to: [to],
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email via Resend: ${error.message}`);
  }

  return { success: true, id: data?.id, provider: 'resend' };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * World-class responsive HTML email layout for Tuitionify
 */
function emailLayout({ title, badge = 'ACCOUNT SECURITY', previewText = '', iconSvg = '', content }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title)}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 48px 12px;
    }
    .email-container {
      max-width: 580px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
      overflow: hidden;
    }
    .top-bar {
      height: 4px;
      background: linear-gradient(90deg, #10b981 0%, #0f8f62 50%, #047857 100%);
    }
    .brand-header {
      padding: 32px 36px 20px;
      border-bottom: 1px solid #f8fafc;
      text-align: left;
    }
    .brand-logo-text {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-highlight {
      color: #10b981;
    }
    .brand-tag {
      font-size: 11px;
      font-weight: 700;
      background: #ecfdf5;
      color: #047857;
      padding: 3px 8px;
      border-radius: 20px;
      margin-left: 8px;
      vertical-align: middle;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .email-body {
      padding: 36px;
      text-align: left;
    }
    .badge-pill {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #047857;
      background: #d1fae5;
      padding: 5px 12px;
      border-radius: 20px;
      margin-bottom: 20px;
    }
    .main-heading {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.3;
      margin: 0 0 16px;
      letter-spacing: -0.5px;
    }
    .lead-text {
      font-size: 15px;
      color: #475569;
      line-height: 1.6;
      margin: 0 0 20px;
    }
    .account-info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .account-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 14px;
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
    }
    .info-val {
      color: #0f172a;
      font-weight: 600;
      font-family: monospace;
      font-size: 13px;
    }
    .cta-wrapper {
      margin: 32px 0;
      text-align: center;
    }
    .primary-btn {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 700;
      padding: 14px 36px;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
      letter-spacing: 0.2px;
    }
    .fallback-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 14px;
      margin: 24px 0 16px;
      word-break: break-all;
      font-size: 12px;
      color: #64748b;
    }
    .fallback-url {
      color: #059669;
      text-decoration: underline;
    }
    .security-notice {
      border-top: 1px solid #f1f5f9;
      padding-top: 20px;
      margin-top: 28px;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .email-footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 24px 36px;
      text-align: center;
    }
    .footer-text {
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
      line-height: 1.5;
    }
    .footer-links {
      margin-top: 12px;
      font-size: 12px;
      color: #94a3b8;
    }
    .footer-links a {
      color: #64748b;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  ${previewText ? `<span style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(previewText)}</span>` : ''}
  <table role="presentation" class="email-wrapper" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="email-container">
          <div class="top-bar"></div>
          <div class="brand-header">
            <span class="brand-logo-text">🎓 Tuition<span class="brand-highlight">ify</span></span>
            <span class="brand-tag">IIUC</span>
          </div>
          <div class="email-body">
            <span class="badge-pill">${badge}</span>
            ${content}
          </div>
          <div class="email-footer">
            <p class="footer-text"><strong>Tuitionify</strong> · The Tuition Marketplace for International Islamic University Chittagong (IIUC)</p>
            <p class="footer-text" style="margin-top:4px;">Kumira, Sitakunda, Chattogram, Bangladesh</p>
            <div class="footer-links">
              &copy; ${new Date().getFullYear()} Tuitionify. This is an automated security notification.
            </div>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send high-converting, professional email verification link
 */
export async function sendVerificationEmail({ to, name, link }) {
  const safeName = escapeHtml(name || 'there');
  const safeLink = escapeHtml(link);
  const safeTo = escapeHtml(to);

  const html = emailLayout({
    title: 'Verify your email address - Tuitionify',
    badge: 'Email Verification',
    previewText: 'Verify your email address to activate your Tuitionify account.',
    content: `
      <h1 class="main-heading">Confirm your email address</h1>
      <p class="lead-text">Hello <strong>${safeName}</strong>,</p>
      <p class="lead-text">Thank you for joining Tuitionify! Please verify your email address to complete your registration and unlock all platform features.</p>
      
      <div class="account-info-box">
        <div class="account-info-row">
          <span class="info-label">Account Email:</span>
          <span class="info-val">${safeTo}</span>
        </div>
        <div class="account-info-row">
          <span class="info-label">Institution:</span>
          <span class="info-val">International Islamic University Chittagong</span>
        </div>
      </div>

      <div class="cta-wrapper">
        <a href="${safeLink}" class="primary-btn" target="_blank" rel="noopener noreferrer">Verify Email Address</a>
      </div>

      <div class="fallback-box">
        <p style="margin: 0 0 6px; font-weight: 600; color: #475569;">Button not working? Paste this link into your browser:</p>
        <a href="${safeLink}" class="fallback-url">${safeLink}</a>
      </div>

      <div class="security-notice">
        <p style="margin: 0 0 4px;">🔒 <strong>Security reminder:</strong> This link will expire according to Firebase's security policy.</p>
        <p style="margin: 0;">If you didn't create an account with Tuitionify, please disregard this message. Your email address will remain unused.</p>
      </div>
    `,
  });

  return await dispatchEmail({
    to,
    subject: 'Verify your Tuitionify account',
    html,
  });
}

/**
 * Send clean, professional password reset email via Resend
 */
export async function sendPasswordResetEmail({ to, name, link }) {
  const client = getResend() || resend;
  if (!client) {
    throw new Error('RESEND_API_KEY is not configured in server environment variables');
  }

  const safeName = escapeHtml(name || 'there');
  const safeLink = escapeHtml(link);
  const safeTo = escapeHtml(to);

  const html = emailLayout({
    title: 'Reset your password - Tuitionify',
    badge: 'Account Security',
    previewText: 'A request was made to reset the password for your Tuitionify account.',
    content: `
      <h1 class="main-heading">Reset your password</h1>
      <p class="lead-text">Hello <strong>${safeName}</strong>,</p>
      <p class="lead-text">We received a request to reset the password for your Tuitionify account. Click the button below to choose a new, secure password:</p>

      <div class="account-info-box">
        <div class="account-info-row">
          <span class="info-label">Account Email:</span>
          <span class="info-val">${safeTo}</span>
        </div>
      </div>

      <div class="cta-wrapper">
        <a href="${safeLink}" class="primary-btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
      </div>

      <div class="fallback-box">
        <p style="margin: 0 0 6px; font-weight: 600; color: #475569;">Button not working? Paste this link into your browser:</p>
        <a href="${safeLink}" class="fallback-url">${safeLink}</a>
      </div>

      <div class="security-notice">
        <p style="margin: 0 0 4px;">⏰ <strong>Notice:</strong> This link will expire according to Firebase's security policy.</p>
        <p style="margin: 0;">If you did not request a password reset, you can safely ignore this email. Your password will remain completely unchanged.</p>
      </div>
    `,
  });

  return await dispatchEmail({
    to,
    subject: 'Reset your Tuitionify password',
    html,
  });
}

/**
 * Optional welcome email
 */
export async function sendWelcomeEmail({ to, name }) {
  const safeName = escapeHtml(name || 'there');

  const html = emailLayout({
    title: 'Welcome to Tuitionify!',
    badge: 'Welcome',
    previewText: 'Your Tuitionify account is verified and ready.',
    content: `
      <h1 class="main-heading">Welcome to Tuitionify!</h1>
      <p class="lead-text">Hello <strong>${safeName}</strong>,</p>
      <p class="lead-text">Your email address has been successfully verified. Your account is now active and ready to use.</p>
      <p class="lead-text">Whether you are offering tuition as an IIUC tutor or looking for the ideal teacher for your studies, Tuitionify connects our campus community directly.</p>
      <div class="cta-wrapper">
        <a href="${process.env.CLIENT_URL || 'https://iiuc-tuitionify.vercel.app'}" class="primary-btn" target="_blank" rel="noopener noreferrer">Explore Dashboard</a>
      </div>
    `,
  });

  try {
    return await dispatchEmail({
      to,
      subject: 'Welcome to Tuitionify!',
      html,
    });
  } catch (err) {
    console.warn('Welcome email could not be sent:', err.message);
    return { success: false };
  }
}

