import { Router } from 'express';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { verifyToken, loadUser, requireRole, requireVerifiedEmail } from '../middleware/auth.js';
import { hasEngagement } from '../utils/engagement.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Recompute a tutor's rating aggregates after any review change.
async function recomputeRating(tutorId) {
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

// POST /api/reviews — seeker reviews a tutor they have engaged
router.post('/', verifyToken, loadUser, requireRole('seeker'), requireVerifiedEmail, rateLimit({ windowMs: 3_600_000, max: 15, name: 'review' }), async (req, res, next) => {
  try {
    const { tutorId, rating, comment } = req.body;
    const tutor = await User.findOne({ _id: tutorId, role: 'tutor' });
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    if (!(await hasEngagement(req.dbUser._id, tutor._id))) {
      return res.status(403).json({
        message: 'You can only review a tutor you have hired or whose contact request you had approved.',
      });
    }

    // Guard the rating range here as well as in the schema, so a bad value
    // produces a 400 rather than a 500 from the model validator.
    const score = Number(rating);
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      return res.status(400).json({ message: 'rating must be a number between 1 and 5' });
    }

    const review = await Review.create({
      tutor: tutor._id,
      author: req.dbUser._id,
      authorName: req.dbUser.name,
      rating: score,
      comment: comment || '',
    });
    await recomputeRating(tutor._id);
    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already reviewed this tutor' });
    }
    next(err);
  }
});

// GET /api/reviews/tutor/:id — reviews for a tutor, newest first.
// Paginated so a heavily-reviewed tutor cannot return an unbounded response.
router.get('/tutor/:id', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const filter = { tutor: req.params.id };
    const [reviews, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Review.countDocuments(filter),
    ]);
    res.json({ data: reviews, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/reviews/:id/reply — tutor replies to a review
router.patch('/:id/reply', verifyToken, loadUser, async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (String(review.tutor) !== String(req.dbUser._id)) {
      return res.status(403).json({ message: 'Only the reviewed tutor can reply' });
    }
    review.reply = req.body.reply || '';
    review.replyAt = new Date();
    await review.save();
    res.json(review);
  } catch (err) {
    next(err);
  }
});

export default router;
