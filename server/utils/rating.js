import Review from '../models/Review.js';
import User from '../models/User.js';

// Recompute a tutor's rating aggregates from the reviews that currently exist.
//
// Lives here rather than in routes/reviews.js because two callers need it:
// posting a review, and deleting an account (which removes that account's
// reviews and so changes the average of every tutor it had reviewed).
//
// Derived, never incremented — so it self-heals after a bulk delete instead of
// drifting. `agg[0]` is absent when the last review is gone, which is exactly
// when the zero defaults matter.
export async function recomputeRating(tutorId) {
  const agg = await Review.aggregate([
    { $match: { tutor: tutorId } },
    { $group: { _id: '$tutor', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const { avg = 0, count = 0 } = agg[0] || {};
  await User.findByIdAndUpdate(tutorId, {
    ratingAvg: Math.round(avg * 10) / 10,
    ratingCount: count,
  });
}
