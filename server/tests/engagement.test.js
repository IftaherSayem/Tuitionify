import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The engagement rule decides who may rate a tutor, and ratingAvg is the
// primary sort key of the public tutor directory — so a regression here
// silently reopens rating manipulation. These tests stub the three models so
// the rule can be exercised without a database.

const mocks = vi.hoisted(() => ({
  tuitionDistinct: vi.fn(),
  applicationExists: vi.fn(),
  contactRequestExists: vi.fn(),
}));

vi.mock('../models/Tuition.js', () => ({
  default: { find: () => ({ distinct: mocks.tuitionDistinct }) },
}));
vi.mock('../models/Application.js', () => ({
  default: { exists: mocks.applicationExists },
}));
vi.mock('../models/ContactRequest.js', () => ({
  default: { exists: mocks.contactRequestExists },
}));

const { hasEngagement } = await import('../utils/engagement.js');

const SEEKER = 'seeker-1';
const TUTOR = 'tutor-1';

beforeEach(() => {
  mocks.tuitionDistinct.mockReset().mockResolvedValue([]);
  mocks.applicationExists.mockReset().mockResolvedValue(null);
  mocks.contactRequestExists.mockReset().mockResolvedValue(null);
});

afterEach(() => vi.clearAllMocks());

describe('hasEngagement', () => {
  it('denies a seeker with no tuitions and no contact request', async () => {
    expect(await hasEngagement(SEEKER, TUTOR)).toBe(false);
  });

  it('allows when the tutor was accepted on the seeker\'s own tuition', async () => {
    mocks.tuitionDistinct.mockResolvedValue(['tuition-1']);
    mocks.applicationExists.mockResolvedValue({ _id: 'app-1' });

    expect(await hasEngagement(SEEKER, TUTOR)).toBe(true);
  });

  it('allows when the tutor approved the seeker\'s contact request', async () => {
    mocks.contactRequestExists.mockResolvedValue({ _id: 'cr-1' });

    expect(await hasEngagement(SEEKER, TUTOR)).toBe(true);
  });

  it('denies when the application exists but is still pending', async () => {
    mocks.tuitionDistinct.mockResolvedValue(['tuition-1']);
    // exists() is called with status:'accepted', so a pending row matches nothing.
    mocks.applicationExists.mockResolvedValue(null);

    expect(await hasEngagement(SEEKER, TUTOR)).toBe(false);
    expect(mocks.applicationExists).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'accepted' }),
    );
  });

  it('denies when the contact request exists but is not approved', async () => {
    mocks.contactRequestExists.mockResolvedValue(null);

    expect(await hasEngagement(SEEKER, TUTOR)).toBe(false);
    expect(mocks.contactRequestExists).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' }),
    );
  });

  it('only counts applications on tuitions the seeker owns', async () => {
    mocks.tuitionDistinct.mockResolvedValue(['mine-1', 'mine-2']);
    mocks.applicationExists.mockResolvedValue({ _id: 'app-1' });

    await hasEngagement(SEEKER, TUTOR);

    // The tuition filter must be scoped to the seeker's own ids — otherwise
    // any accepted application anywhere would qualify.
    expect(mocks.applicationExists).toHaveBeenCalledWith(
      expect.objectContaining({ tuition: { $in: ['mine-1', 'mine-2'] } }),
    );
  });

  it('skips the application query entirely when the seeker owns no tuitions', async () => {
    mocks.tuitionDistinct.mockResolvedValue([]);

    await hasEngagement(SEEKER, TUTOR);

    expect(mocks.applicationExists).not.toHaveBeenCalled();
  });

  it('checks the engagement against the requested tutor, not another one', async () => {
    mocks.contactRequestExists.mockResolvedValue({ _id: 'cr-1' });

    await hasEngagement(SEEKER, TUTOR);

    expect(mocks.contactRequestExists).toHaveBeenCalledWith(
      expect.objectContaining({ tutor: TUTOR, seeker: SEEKER }),
    );
  });

  it('returns a boolean, never a truthy document', async () => {
    mocks.contactRequestExists.mockResolvedValue({ _id: 'cr-1' });

    expect(await hasEngagement(SEEKER, TUTOR)).toBe(true);
  });
});
