import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// One accepted applicant per tuition. Nothing in the schema enforces this — the
// unique index is { tuition, tutor }, which stops one tutor applying twice, not
// one tuition accepting twice — so the rule lives in code and a regression here
// silently re-opens double-hiring. Stubs the model so it runs without a DB.

const mocks = vi.hoisted(() => ({
  applicationExists: vi.fn(),
}));

vi.mock('../models/Application.js', () => ({
  default: { exists: mocks.applicationExists },
}));

const { hasAcceptedApplicant } = await import('../utils/acceptance.js');

const TUITION = 'tuition-1';
const APP = 'app-1';

beforeEach(() => {
  mocks.applicationExists.mockReset().mockResolvedValue(null);
});

afterEach(() => vi.clearAllMocks());

describe('hasAcceptedApplicant', () => {
  it('is false when no applicant has been accepted', async () => {
    expect(await hasAcceptedApplicant(TUITION)).toBe(false);
  });

  it('is true when another applicant already holds the slot', async () => {
    mocks.applicationExists.mockResolvedValue({ _id: 'other-app' });

    expect(await hasAcceptedApplicant(TUITION, { exceptId: APP })).toBe(true);
  });

  it('only counts accepted rows, not pending or rejected ones', async () => {
    await hasAcceptedApplicant(TUITION);

    expect(mocks.applicationExists).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'accepted' }),
    );
  });

  it('scopes the check to the tuition being decided', async () => {
    await hasAcceptedApplicant(TUITION);

    // Without this scope, an acceptance on any other post would block a hire.
    expect(mocks.applicationExists).toHaveBeenCalledWith(
      expect.objectContaining({ tuition: TUITION }),
    );
  });

  it('excludes the application being decided, so re-accepting is a no-op', async () => {
    await hasAcceptedApplicant(TUITION, { exceptId: APP });

    expect(mocks.applicationExists).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $ne: APP } }),
    );
  });

  it('omits the _id exclusion entirely when no exceptId is given', async () => {
    await hasAcceptedApplicant(TUITION);

    // `{ _id: { $ne: undefined } }` would match nothing in Mongo, quietly
    // turning the guard off.
    expect(mocks.applicationExists).toHaveBeenCalledWith(
      expect.not.objectContaining({ _id: expect.anything() }),
    );
  });

  it('returns a boolean, never the matched document', async () => {
    mocks.applicationExists.mockResolvedValue({ _id: 'other-app' });

    expect(await hasAcceptedApplicant(TUITION)).toBe(true);
  });
});
