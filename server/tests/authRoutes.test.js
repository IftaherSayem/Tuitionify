import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  getUser: vi.fn(),
  getUserByEmail: vi.fn(),
  generateEmailVerificationLink: vi.fn(),
  generatePasswordResetLink: vi.fn(),
  sendEmail: vi.fn(),
  apps: [{}],
}));

vi.mock('../config/firebase.js', () => ({
  admin: {
    get apps() {
      return mocks.apps;
    },
    auth: () => ({
      verifyIdToken: mocks.verifyIdToken,
      getUser: mocks.getUser,
      getUserByEmail: mocks.getUserByEmail,
      generateEmailVerificationLink: mocks.generateEmailVerificationLink,
      generatePasswordResetLink: mocks.generatePasswordResetLink,
    }),
  },
}));

vi.mock('../config/resend.js', () => ({
  getResend: () => ({
    emails: {
      send: mocks.sendEmail,
    },
  }),
  resend: {
    emails: {
      send: mocks.sendEmail,
    },
  },
  DEFAULT_SENDER: 'Tuitionify <noreply@tuitionify.publicvm.com>',
}));

// Import router after mocking
const { default: authRouter } = await import('../routes/auth.js');
const { sendVerificationEmail, sendPasswordResetEmail } = await import('../services/email.js');

function mockCtx({ headers = {}, body = {}, firebaseUser = null } = {}) {
  const req = {
    headers,
    body,
    firebaseUser,
    ip: '127.0.0.1',
    path: '/test',
  };
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
    set(k, v) {
      this.headers[k] = v;
      return this;
    },
  };
  const next = vi.fn();
  return { req, res, next };
}

// Find route handler helper
function getRouteHandler(router, path, method) {
  const route = router.stack.find(
    (layer) => layer.route && layer.route.path === path && layer.route.methods[method.toLowerCase()],
  );
  if (!route) throw new Error(`Route ${method} ${path} not found`);
  // Last function in stack is the controller
  return route.route.stack[route.route.stack.length - 1].handle;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.apps = [{}];
  mocks.sendEmail.mockResolvedValue({ data: { id: 'msg_123' }, error: null });
  process.env.CLIENT_URL = 'https://iiuc-tuitionify.vercel.app';
});

describe('Auth Routes - POST /api/auth/send-verification', () => {
  const handler = getRouteHandler(authRouter, '/send-verification', 'POST');

  it('generates verification link and sends email for unverified user', async () => {
    const c = mockCtx({
      firebaseUser: { uid: 'usr_1', email: 'student@example.com', name: 'John' },
    });

    mocks.getUser.mockResolvedValue({
      uid: 'usr_1',
      email: 'student@example.com',
      emailVerified: false,
      displayName: 'John Doe',
    });
    mocks.generateEmailVerificationLink.mockResolvedValue('https://firebase.link/verify?code=abc');

    await handler(c.req, c.res, c.next);

    expect(mocks.generateEmailVerificationLink).toHaveBeenCalledWith(
      'student@example.com',
      expect.objectContaining({ url: 'https://iiuc-tuitionify.vercel.app/auth/action' }),
    );
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['student@example.com'],
        subject: 'Verify your Tuitionify account',
      }),
    );
    expect(c.res.body).toEqual({
      success: true,
      message: 'Verification email sent successfully',
    });
  });

  it('does not send email if user is already verified', async () => {
    const c = mockCtx({
      firebaseUser: { uid: 'usr_1', email: 'verified@example.com' },
    });

    mocks.getUser.mockResolvedValue({
      uid: 'usr_1',
      email: 'verified@example.com',
      emailVerified: true,
    });

    await handler(c.req, c.res, c.next);

    expect(mocks.generateEmailVerificationLink).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(c.res.body.alreadyVerified).toBe(true);
  });

  it('rejects with 400 if user token has no email', async () => {
    const c = mockCtx({
      firebaseUser: { uid: 'usr_no_email' },
    });

    await handler(c.req, c.res, c.next);

    expect(c.res.statusCode).toBe(400);
    expect(c.res.body.message).toContain('No email');
  });
});

describe('Auth Routes - POST /api/auth/send-password-reset', () => {
  const handler = getRouteHandler(authRouter, '/send-password-reset', 'POST');

  it('rejects invalid email formats with 400', async () => {
    const c = mockCtx({ body: { email: 'invalid-email' } });

    await handler(c.req, c.res, c.next);

    expect(c.res.statusCode).toBe(400);
    expect(c.res.body.message).toContain('valid email');
  });

  it('generates reset link and sends email when user exists', async () => {
    const c = mockCtx({ body: { email: 'registered@example.com' } });

    mocks.getUserByEmail.mockResolvedValue({
      uid: 'usr_reg',
      email: 'registered@example.com',
      displayName: 'Alice',
    });
    mocks.generatePasswordResetLink.mockResolvedValue('https://firebase.link/reset?code=xyz');

    await handler(c.req, c.res, c.next);

    expect(mocks.generatePasswordResetLink).toHaveBeenCalledWith(
      'registered@example.com',
      expect.objectContaining({ url: 'https://iiuc-tuitionify.vercel.app/auth/action' }),
    );
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['registered@example.com'],
        subject: 'Reset your Tuitionify password',
      }),
    );
    expect(c.res.body.success).toBe(true);
    expect(c.res.body.message).toContain('If an account exists');
  });

  it('prevents enumeration: returns generic success without error when user is not found', async () => {
    const c = mockCtx({ body: { email: 'unknown@example.com' } });

    const notFoundError = new Error('User not found');
    notFoundError.code = 'auth/user-not-found';
    mocks.getUserByEmail.mockRejectedValue(notFoundError);

    await handler(c.req, c.res, c.next);

    expect(mocks.generatePasswordResetLink).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    // Same generic response returned
    expect(c.res.body).toEqual({
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.',
    });
  });
});

describe('Email Service Templates', () => {
  it('sendVerificationEmail includes action link, logo and branding', async () => {
    await sendVerificationEmail({
      to: 'student@example.com',
      name: 'John Doe',
      link: 'https://iiuc-tuitionify.vercel.app/auth/action?mode=verifyEmail&oobCode=123',
    });

    expect(mocks.sendEmail).toHaveBeenCalled();
    const callArgs = mocks.sendEmail.mock.calls[0][0];
    expect(callArgs.to).toEqual(['student@example.com']);
    expect(callArgs.subject).toBe('Verify your Tuitionify account');
    expect(callArgs.html).toContain('Verify your email address');
    expect(callArgs.html).toContain('Tuition');
    expect(callArgs.html).toContain('https://iiuc-tuitionify.vercel.app/auth/action?mode=verifyEmail&amp;oobCode=123');
  });

  it('sendPasswordResetEmail includes reset link and security disclaimer', async () => {
    await sendPasswordResetEmail({
      to: 'student@example.com',
      name: 'John Doe',
      link: 'https://iiuc-tuitionify.vercel.app/auth/action?mode=resetPassword&oobCode=456',
    });

    expect(mocks.sendEmail).toHaveBeenCalled();
    const callArgs = mocks.sendEmail.mock.calls[0][0];
    expect(callArgs.to).toEqual(['student@example.com']);
    expect(callArgs.subject).toBe('Reset your Tuitionify password');
    expect(callArgs.html).toContain('Reset your password');
    expect(callArgs.html).toContain('If you did not request a password reset');
  });
});
