import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Account deletion is the one operation with no undo and no backup to fall
// back on, and its correctness is entirely about coverage: seven collections
// reference a User, and any one of them left behind is a dangling ObjectId that
// populate() turns into a blank card in somebody else's list. So these tests
// assert on the filters the purge issues rather than on a return value —
// a missed collection is invisible until real data rots. Models are stubbed so
// the whole cascade runs without a database.

const mocks = vi.hoisted(() => {
  const deleteMany = () => vi.fn().mockResolvedValue({ deletedCount: 0 });
  return {
    tuitionDistinct: vi.fn(),
    reviewDistinct: vi.fn(),
    tuitionDeleteMany: deleteMany(),
    applicationDeleteMany: deleteMany(),
    contactRequestDeleteMany: deleteMany(),
    reviewDeleteMany: deleteMany(),
    reportDeleteMany: deleteMany(),
    bookmarkDeleteMany: deleteMany(),
    tutorBookmarkDeleteMany: deleteMany(),
    userDeleteOne: vi.fn(),
    recomputeRating: vi.fn(),
  };
});

vi.mock('../models/User.js', () => ({
  default: { deleteOne: mocks.userDeleteOne },
}));
vi.mock('../models/Tuition.js', () => ({
  default: {
    find: () => ({ distinct: mocks.tuitionDistinct }),
    deleteMany: mocks.tuitionDeleteMany,
  },
}));
vi.mock('../models/Application.js', () => ({
  default: { deleteMany: mocks.applicationDeleteMany },
}));
vi.mock('../models/ContactRequest.js', () => ({
  default: { deleteMany: mocks.contactRequestDeleteMany },
}));
vi.mock('../models/Review.js', () => ({
  default: {
    find: () => ({ distinct: mocks.reviewDistinct }),
    deleteMany: mocks.reviewDeleteMany,
  },
}));
vi.mock('../models/Report.js', () => ({
  default: { deleteMany: mocks.reportDeleteMany },
}));
vi.mock('../models/Bookmark.js', () => ({
  default: { deleteMany: mocks.bookmarkDeleteMany },
}));
vi.mock('../models/TutorBookmark.js', () => ({
  default: { deleteMany: mocks.tutorBookmarkDeleteMany },
}));
vi.mock('../utils/rating.js', () => ({
  recomputeRating: mocks.recomputeRating,
}));

const { purgeUserData } = await import('../utils/accountDeletion.js');

const USER = 'user-1';

// Did any call to this deleteMany use a filter matching the predicate?
const calledWith = (mock, predicate) => mock.mock.calls.some(([filter]) => predicate(filter));
// Does an $or filter contain this exact clause?
const hasClause = (mock, clause) =>
  calledWith(mock, (f) => (f.$or || []).some((c) => JSON.stringify(c) === JSON.stringify(clause)));

beforeEach(() => {
  mocks.tuitionDistinct.mockReset().mockResolvedValue([]);
  mocks.reviewDistinct.mockReset().mockResolvedValue([]);
  for (const key of [
    'tuitionDeleteMany', 'applicationDeleteMany', 'contactRequestDeleteMany',
    'reviewDeleteMany', 'reportDeleteMany', 'bookmarkDeleteMany', 'tutorBookmarkDeleteMany',
  ]) {
    mocks[key].mockReset().mockResolvedValue({ deletedCount: 0 });
  }
  mocks.userDeleteOne.mockReset().mockResolvedValue({ deletedCount: 1 });
  mocks.recomputeRating.mockReset().mockResolvedValue(undefined);
});

afterEach(() => vi.clearAllMocks());

describe('purgeUserData — collection coverage', () => {
  it('deletes the tuitions the user posted', async () => {
    await purgeUserData(USER);

    expect(calledWith(mocks.tuitionDeleteMany, (f) => f.createdBy === USER)).toBe(true);
  });

  it('deletes the applications the user filed as a tutor', async () => {
    await purgeUserData(USER);

    expect(calledWith(mocks.applicationDeleteMany, (f) => f.tutor === USER)).toBe(true);
  });

  it('deletes contact requests in both directions', async () => {
    await purgeUserData(USER);

    expect(hasClause(mocks.contactRequestDeleteMany, { tutor: USER })).toBe(true);
    expect(hasClause(mocks.contactRequestDeleteMany, { seeker: USER })).toBe(true);
  });

  it('deletes reviews the user received and reviews they wrote', async () => {
    await purgeUserData(USER);

    expect(hasClause(mocks.reviewDeleteMany, { tutor: USER })).toBe(true);
    expect(hasClause(mocks.reviewDeleteMany, { author: USER })).toBe(true);
  });

  it('deletes reports the user filed and reports filed about them', async () => {
    await purgeUserData(USER);

    // Both directions matter: leaving reports *about* the account behind keeps
    // an admin queue item pointing at a profile that no longer resolves.
    expect(hasClause(mocks.reportDeleteMany, { reporter: USER })).toBe(true);
    expect(hasClause(mocks.reportDeleteMany, { targetType: 'user', targetId: USER })).toBe(true);
  });

  it('deletes the user\'s saved tuitions', async () => {
    await purgeUserData(USER);

    expect(calledWith(mocks.bookmarkDeleteMany, (f) => f.user === USER)).toBe(true);
  });

  it('deletes tutor bookmarks the user made and bookmarks pointing at them', async () => {
    await purgeUserData(USER);

    // A departing tutor sitting in other people's Saved Tutors list would
    // render as an empty card, since the populated ref resolves to null.
    expect(hasClause(mocks.tutorBookmarkDeleteMany, { user: USER })).toBe(true);
    expect(hasClause(mocks.tutorBookmarkDeleteMany, { tutor: USER })).toBe(true);
  });

  it('removes the profile itself', async () => {
    await purgeUserData(USER);

    expect(mocks.userDeleteOne).toHaveBeenCalledWith({ _id: USER });
  });
});

describe('purgeUserData — cascade into the user\'s own tuitions', () => {
  it('deletes the applications, bookmarks and reports attached to those tuitions', async () => {
    mocks.tuitionDistinct.mockResolvedValue(['t1', 't2']);

    await purgeUserData(USER);

    const scoped = (mock) => calledWith(mock, (f) => JSON.stringify(f.tuition) === JSON.stringify({ $in: ['t1', 't2'] }));
    expect(scoped(mocks.applicationDeleteMany)).toBe(true);
    expect(scoped(mocks.bookmarkDeleteMany)).toBe(true);
    expect(calledWith(mocks.reportDeleteMany, (f) =>
      f.targetType === 'tuition' && JSON.stringify(f.targetId) === JSON.stringify({ $in: ['t1', 't2'] }))).toBe(true);
  });

  it('skips the child queries entirely when the user posted nothing', async () => {
    mocks.tuitionDistinct.mockResolvedValue([]);

    await purgeUserData(USER);

    // `{ $in: [] }` matches nothing, so these would be three wasted round
    // trips on every tutor account — tutors never post tuitions.
    expect(calledWith(mocks.applicationDeleteMany, (f) => 'tuition' in f)).toBe(false);
    expect(calledWith(mocks.bookmarkDeleteMany, (f) => 'tuition' in f)).toBe(false);
    expect(calledWith(mocks.reportDeleteMany, (f) => f.targetType === 'tuition')).toBe(false);
  });
});

describe('purgeUserData — ratings left behind', () => {
  it('recomputes the rating of every tutor the departing user had reviewed', async () => {
    mocks.reviewDistinct.mockResolvedValue(['tutor-a', 'tutor-b']);

    await purgeUserData(USER);

    // Without this, a deleted 1-star review keeps dragging a tutor down the
    // directory forever — ratingAvg is its primary sort key.
    expect(mocks.recomputeRating).toHaveBeenCalledWith('tutor-a');
    expect(mocks.recomputeRating).toHaveBeenCalledWith('tutor-b');
  });

  it('collects the affected tutors before deleting the reviews', async () => {
    const order = [];
    mocks.reviewDistinct.mockImplementation(async () => {
      order.push('read');
      return ['tutor-a'];
    });
    mocks.reviewDeleteMany.mockImplementation(async () => {
      order.push('delete');
      return { deletedCount: 1 };
    });

    await purgeUserData(USER);

    // Reversed, the author's reviews are already gone and distinct() returns
    // an empty list — the recompute silently becomes a no-op.
    expect(order).toEqual(['read', 'delete']);
  });

  it('recomputes after the delete, so the aggregate sees what is left', async () => {
    const order = [];
    mocks.reviewDistinct.mockResolvedValue(['tutor-a']);
    mocks.reviewDeleteMany.mockImplementation(async () => {
      order.push('delete');
      return { deletedCount: 1 };
    });
    mocks.recomputeRating.mockImplementation(async () => { order.push('recompute'); });

    await purgeUserData(USER);

    expect(order).toEqual(['delete', 'recompute']);
  });

  it('does not recompute a rating for the departing user themselves', async () => {
    mocks.reviewDistinct.mockResolvedValue([USER, 'tutor-a']);

    await purgeUserData(USER);

    expect(mocks.recomputeRating).not.toHaveBeenCalledWith(USER);
    expect(mocks.recomputeRating).toHaveBeenCalledWith('tutor-a');
  });

  it('recomputes nothing when the user never wrote a review', async () => {
    await purgeUserData(USER);

    expect(mocks.recomputeRating).not.toHaveBeenCalled();
  });
});

describe('purgeUserData — failure safety', () => {
  it('deletes the profile only after the referencing rows are gone', async () => {
    const order = [];
    mocks.reviewDeleteMany.mockImplementation(async () => {
      order.push('rows');
      return { deletedCount: 1 };
    });
    mocks.userDeleteOne.mockImplementation(async () => {
      order.push('profile');
      return { deletedCount: 1 };
    });

    await purgeUserData(USER);

    // The purge has no transaction, so re-runnability is the guarantee: while
    // the profile exists the whole thing can be run again. Deleting it first
    // would orphan whatever remained, with no key left to find it by.
    expect(order).toEqual(['rows', 'profile']);
  });

  it('leaves the profile in place when a cascade step throws', async () => {
    mocks.contactRequestDeleteMany.mockRejectedValue(new Error('connection reset'));

    await expect(purgeUserData(USER)).rejects.toThrow('connection reset');
    expect(mocks.userDeleteOne).not.toHaveBeenCalled();
  });

  it('reports what it removed, counting tuition children in', async () => {
    mocks.tuitionDistinct.mockResolvedValue(['t1']);
    mocks.reviewDistinct.mockResolvedValue(['tutor-a']);
    mocks.applicationDeleteMany
      .mockResolvedValueOnce({ deletedCount: 4 })  // applicants on the user's own posts
      .mockResolvedValueOnce({ deletedCount: 2 }); // the user's own applications
    mocks.tuitionDeleteMany.mockResolvedValue({ deletedCount: 1 });

    const removed = await purgeUserData(USER);

    expect(removed.tuitions).toBe(1);
    expect(removed.applications).toBe(6);
    expect(removed.ratingsRecomputed).toBe(1);
  });
});
