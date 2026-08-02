import { describe, it, expect, vi, beforeEach } from 'vitest';

// Auth guards. optionalAuth in particular is the one that leaked a tutor's
// phone/email to a banned seeker, so the restricted case is pinned here.

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  findOne: vi.fn(),
  apps: [{}], // non-empty => "Firebase Admin is configured"
}));

vi.mock('../config/firebase.js', () => ({
  admin: {
    get apps() { return mocks.apps; },
    auth: () => ({ verifyIdToken: mocks.verifyIdToken }),
  },
}));
vi.mock('../models/User.js', () => ({
  default: { findOne: mocks.findOne },
}));

const { optionalAuth, requireVerifiedEmail, requireRole, requireAdmin } =
  await import('../middleware/auth.js');

// Minimal express double: records what the handler did.
function ctx({ headers = {}, ...rest } = {}) {
  const req = { headers, ...rest };
  const res = {
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
  const next = vi.fn();
  return { req, res, next };
}

beforeEach(() => {
  mocks.verifyIdToken.mockReset();
  mocks.findOne.mockReset();
  mocks.apps = [{}];
});

describe('optionalAuth', () => {
  it('continues anonymously when no token is present', async () => {
    const { req, res, next } = ctx();
    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.dbUser).toBeUndefined();
  });

  it('attaches the user for a valid token', async () => {
    const user = { _id: 'u1', restricted: false };
    mocks.verifyIdToken.mockResolvedValue({ uid: 'fb1' });
    mocks.findOne.mockResolvedValue(user);

    const { req, res, next } = ctx({ headers: { authorization: 'Bearer good' } });
    await optionalAuth(req, res, next);

    expect(req.dbUser).toBe(user);
    expect(next).toHaveBeenCalled();
  });

  it('does NOT attach a restricted user — a ban must apply here too', async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: 'fb1' });
    mocks.findOne.mockResolvedValue({ _id: 'u1', restricted: true });

    const { req, res, next } = ctx({ headers: { authorization: 'Bearer good' } });
    await optionalAuth(req, res, next);

    expect(req.dbUser).toBeUndefined();
    expect(next).toHaveBeenCalled(); // still continues, just as anonymous
  });

  it('treats an invalid token as anonymous instead of erroring', async () => {
    mocks.verifyIdToken.mockRejectedValue(new Error('expired'));

    const { req, res, next } = ctx({ headers: { authorization: 'Bearer bad' } });
    await optionalAuth(req, res, next);

    expect(req.dbUser).toBeUndefined();
    expect(res.statusCode).toBeNull();
    expect(next).toHaveBeenCalled();
  });

  it('ignores an Authorization header that is not a Bearer token', async () => {
    const { req, res, next } = ctx({ headers: { authorization: 'Basic abc123' } });
    await optionalAuth(req, res, next);

    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});

describe('requireVerifiedEmail', () => {
  const run = (req) => {
    const c = ctx(req);
    requireVerifiedEmail(c.req, c.res, c.next);
    return c;
  };

  it('passes when the live token says verified', () => {
    const { next } = run({ firebaseUser: { email_verified: true } });
    expect(next).toHaveBeenCalled();
  });

  it('passes on the DB mirror when the token has not caught up yet', () => {
    const { next } = run({ firebaseUser: { email_verified: false }, dbUser: { emailVerified: true } });
    expect(next).toHaveBeenCalled();
  });

  it('blocks with 403 when neither source says verified', () => {
    const { res, next } = run({ firebaseUser: { email_verified: false }, dbUser: { emailVerified: false } });
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks when there is no user context at all', () => {
    const { res, next } = run({});
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  it('allows the matching role', () => {
    const { req, res, next } = ctx({ dbUser: { role: 'tutor' } });
    requireRole('tutor')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks a mismatched role with 403', () => {
    const { req, res, next } = ctx({ dbUser: { role: 'seeker' } });
    requireRole('tutor')(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks when there is no user', () => {
    const { req, res, next } = ctx();
    requireRole('tutor')(req, res, next);
    expect(res.statusCode).toBe(403);
  });
});

describe('requireAdmin', () => {
  const withAdmins = (list, req) => {
    const prev = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = list;
    const c = ctx(req);
    requireAdmin(c.req, c.res, c.next);
    process.env.ADMIN_EMAILS = prev;
    return c;
  };

  it('allows an email listed in ADMIN_EMAILS', () => {
    const { next } = withAdmins('boss@iiuc.ac.bd', { dbUser: { email: 'boss@iiuc.ac.bd' } });
    expect(next).toHaveBeenCalled();
  });

  it('is case-insensitive and tolerates spacing in the list', () => {
    const { next } = withAdmins(' Boss@IIUC.ac.bd , other@x.com ', { dbUser: { email: 'boss@iiuc.ac.bd' } });
    expect(next).toHaveBeenCalled();
  });

  it('blocks an unlisted email', () => {
    const { res, next } = withAdmins('boss@iiuc.ac.bd', { dbUser: { email: 'random@x.com' } });
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks everyone when ADMIN_EMAILS is empty', () => {
    const { res } = withAdmins('', { dbUser: { email: 'anyone@x.com' } });
    expect(res.statusCode).toBe(403);
  });
});
