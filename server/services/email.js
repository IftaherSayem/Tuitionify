import { resend, DEFAULT_SENDER } from '../config/resend.js';

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
      letter-spacing: -0.5px;
      color: #0f172a;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }
    .brand-highlight {
      color: #0f8f62;
    }
    .brand-tag {
      display: inline-block;
      margin-left: 10px;
      padding: 3px 8px;
      background-color: #ecfdf5;
      color: #059669;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      border-radius: 6px;
      vertical-align: middle;
      text-transform: uppercase;
    }
    .email-body {
      padding: 32px 36px;
    }
    .badge-pill {
      display: inline-block;
      padding: 4px 10px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .main-heading {
      margin: 0 0 14px;
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
      letter-spacing: -0.3px;
    }
    .lead-text {
      margin: 0 0 16px;
      font-size: 15px;
      line-height: 1.65;
      color: #475569;
    }
    .cta-wrapper {
      margin: 32px 0 28px;
      text-align: left;
    }
    .primary-btn {
      display: inline-block;
      padding: 14px 34px;
      background-color: #0f8f62;
      background-image: linear-gradient(180deg, #10b981 0%, #0f8f62 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(15, 143, 98, 0.28);
      text-align: center;
    }
    .account-info-box {
      margin: 24px 0;
      padding: 16px 20px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-size: 13px;
      color: #475569;
    }
    .account-info-row {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
    }
    .info-label {
      color: #64748b;
    }
    .info-val {
      font-weight: 600;
      color: #0f172a;
    }
    .fallback-box {
      margin-top: 24px;
      padding: 16px 18px;
      background-color: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .fallback-url {
      color: #0f8f62;
      text-decoration: underline;
      word-break: break-all;
      font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 11px;
    }
    .security-notice {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.55;
    }
    .email-footer {
      padding: 24px 36px 32px;
      background-color: #f8fafc;
      border-top: 1px solid #f1f5f9;
      text-align: left;
    }
    .footer-text {
      margin: 0;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .footer-links {
      margin-top: 10px;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  ${previewText ? `<span style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${escapeHtml(previewText)}</span>` : ''}
  <table class="email-wrapper" role="presentation" cellpadding="0" cellspacing="0">
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
 * Send high-converting, professional email verification link via Resend
 */
export async function sendVerificationEmail({ to, name, link }) {
  if (!resend) {
    throw new Error('Resend is not configured on the server. Please check RESEND_API_KEY.');
  }

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

  const { data, error } = await resend.emails.send({
    from: DEFAULT_SENDER,
    to: [to],
    subject: 'Verify your Tuitionify account',
    html,
  });

  if (error) {
    throw new Error(`Failed to send verification email via Resend: ${error.message}`);
  }

  return { success: true, id: data?.id };
}

/**
 * Send clean, professional password reset email via Resend
 */
export async function sendPasswordResetEmail({ to, name, link }) {
  if (!resend) {
    throw new Error('Resend is not configured on the server. Please check RESEND_API_KEY.');
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

  const { data, error } = await resend.emails.send({
    from: DEFAULT_SENDER,
    to: [to],
    subject: 'Reset your Tuitionify password',
    html,
  });

  if (error) {
    throw new Error(`Failed to send password reset email via Resend: ${error.message}`);
  }

  return { success: true, id: data?.id };
}

/**
 * Optional welcome email
 */
export async function sendWelcomeEmail({ to, name }) {
  if (!resend) return { success: false };

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
    const { data } = await resend.emails.send({
      from: DEFAULT_SENDER,
      to: [to],
      subject: 'Welcome to Tuitionify!',
      html,
    });
    return { success: true, id: data?.id };
  } catch (err) {
    console.warn('Welcome email could not be sent:', err.message);
    return { success: false };
  }
}
