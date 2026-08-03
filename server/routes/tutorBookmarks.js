import { Router } from 'express';
import TutorBookmark from '../models/TutorBookmark.js';
import { verifyToken, loadUser, NOT_RESTRICTED } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken, loadUser);

router.post('/:tutorId', async (req, res, next) => {
  try {
    const existing = await TutorBookmark.findOne({ user: req.dbUser._id, tutor: req.params.tutorId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ bookmarked: false });
    }
    await TutorBookmark.create({ user: req.dbUser._id, tutor: req.params.tutorId });
    res.json({ bookmarked: true });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    // `match` leaves a restricted tutor's bookmark with tutor: null rather than
    // dropping the row, which is what the dashboard already skips. Otherwise a
    // saved card would render and then 404 on click.
    const bookmarks = await TutorBookmark.find({ user: req.dbUser._id })
      .populate({
        path: 'tutor',
        select: 'name photo university department subjects preferredAreas expectedSalary ratingAvg ratingCount isVerified',
        match: NOT_RESTRICTED,
      })
      .sort({ createdAt: -1 });
    res.json(bookmarks);
  } catch (err) {
    next(err);
  }
});

router.get('/check', async (req, res, next) => {
  try {
    const ids = [].concat(req.query.tutorIds || []).filter(Boolean);
    if (!ids.length) return res.json([]);
    const bookmarks = await TutorBookmark.find({ user: req.dbUser._id, tutor: { $in: ids } });
    res.json(bookmarks.map((b) => b.tutor.toString()));
  } catch (err) {
    next(err);
  }
});

export default router;
