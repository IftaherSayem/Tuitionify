import User from '../models/User.js';
import Tuition from '../models/Tuition.js';
import Application from '../models/Application.js';
import ContactRequest from '../models/ContactRequest.js';
import Review from '../models/Review.js';
import Report from '../models/Report.js';
import Bookmark from '../models/Bookmark.js';
import TutorBookmark from '../models/TutorBookmark.js';
import { recomputeRating } from './rating.js';

// Erase a user and every row that points at them.
//
// Seven collections reference a User, and a miss in any one of them leaves a
// dangling ObjectId that populate() resolves to null — a tuition with no
// poster, an applicant list with a blank card, a review signed by nobody. So
// the list below is deliberately exhaustive rather than "the obvious ones".
//
// Order is chosen for what a partial failure leaves behind. There is no
// transaction here (it would mean threading a session through every model call
// for an operation that runs once per account), so the guarantee on offer is
// re-runnability instead: every step is a filter-based deleteMany, so repeating
// it is a no-op, and the User document is deleted LAST. If a step throws, the
// profile still exists and the whole purge can simply be run again. Deleting
// the user first would orphan the remaining rows with no key left to find them
// by.
export async function purgeUserData(userId) {
  // Read before destroying: both of these are unrecoverable once their rows go.
  const [ownTuitionIds, reviewedTutorIds] = await Promise.all([
    Tuition.find({ createdBy: userId }).distinct('_id'),
    Review.find({ author: userId }).distinct('tutor'),
  ]);

  // Children of the user's own tuitions. These are keyed on the tuition, not on
  // the user, so deleting the user's posts alone would leave them stranded —
  // the same cascade DELETE /api/tuitions/:id performs, applied in bulk.
  const tuitionChildren = ownTuitionIds.length
    ? await Promise.all([
      Application.deleteMany({ tuition: { $in: ownTuitionIds } }),
      Bookmark.deleteMany({ tuition: { $in: ownTuitionIds } }),
      Report.deleteMany({ targetType: 'tuition', targetId: { $in: ownTuitionIds } }),
    ])
    : [];

  const [
    tuitions, applications, contactRequests, reviews, reports, bookmarks, tutorBookmarks,
  ] = await Promise.all([
    Tuition.deleteMany({ createdBy: userId }),
    // Applications this user filed as a tutor, on other people's posts. An
    // accepted one leaves that tuition closed with nobody hired — deliberately
    // left closed rather than reopened, since republishing a guardian's post
    // without asking is not this function's call to make. The reopen guard in
    // routes/tuitions.js keys off an accepted row, so with this one gone the
    // guardian can reopen it themselves.
    Application.deleteMany({ tutor: userId }),
    ContactRequest.deleteMany({ $or: [{ tutor: userId }, { seeker: userId }] }),
    // Reviews are removed rather than anonymised: the unique index is
    // { tutor, author }, so blanking the author would collide on the second
    // orphaned review for the same tutor.
    Review.deleteMany({ $or: [{ tutor: userId }, { author: userId }] }),
    // Both directions — reports this user filed, and reports filed about them.
    Report.deleteMany({ $or: [{ reporter: userId }, { targetType: 'user', targetId: userId }] }),
    Bookmark.deleteMany({ user: userId }),
    TutorBookmark.deleteMany({ $or: [{ user: userId }, { tutor: userId }] }),
  ]);

  // Those deleted reviews were part of somebody's public average, and
  // ratingAvg is the primary sort key of the tutor directory. Recompute after
  // the delete, so the aggregate sees the rows that are actually left.
  // The departing user is skipped — their profile is about to go.
  const affectedTutorIds = reviewedTutorIds.filter((id) => String(id) !== String(userId));
  for (const tutorId of affectedTutorIds) {
    await recomputeRating(tutorId);
  }

  await User.deleteOne({ _id: userId });

  const total = (results) => results.reduce((sum, r) => sum + (r?.deletedCount || 0), 0);
  return {
    tuitions: tuitions?.deletedCount || 0,
    applications: total([applications, tuitionChildren[0]]),
    contactRequests: contactRequests?.deletedCount || 0,
    reviews: reviews?.deletedCount || 0,
    reports: total([reports, tuitionChildren[2]]),
    bookmarks: total([bookmarks, tuitionChildren[1]]),
    tutorBookmarks: tutorBookmarks?.deletedCount || 0,
    ratingsRecomputed: affectedTutorIds.length,
  };
}
