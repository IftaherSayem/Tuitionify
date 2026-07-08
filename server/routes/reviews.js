import { Router } from 'express';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { verifyToken, loadUser, requireRole } from '../middleware/auth.js';

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

// POST /api/reviews — seeker reviews a tutor
router.post('/', verifyToken, loadUser, requireRole('seeker'), async (req, res, next) => {
  try {
    const { tutorId, rating, comment } = req.body;
    const tutor = await User.findOne({ _id: tutorId, role: 'tutor' });
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    const review = await Review.create({
      tutor: tutor._id,
      author: req.dbUser._id,
      authorName: req.dbUser.name,
      rating: Number(rating),
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

// GET /api/reviews/tutor/:id — reviews for a tutor
router.get('/tutor/:id', async (req, res, next) => {
  try {
    const reviews = await Review.find({ tutor: req.params.id }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    next(err);
  }
});

export default router;
