import { Router } from 'express';
import Bookmark from '../models/Bookmark.js';
import { verifyToken, loadUser } from '../middleware/auth.js';

const router = Router();

router.use(verifyToken, loadUser);

router.post('/:tuitionId', async (req, res, next) => {
  try {
    const existing = await Bookmark.findOne({ user: req.dbUser._id, tuition: req.params.tuitionId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ bookmarked: false });
    }
    await Bookmark.create({ user: req.dbUser._id, tuition: req.params.tuitionId });
    res.json({ bookmarked: true });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const bookmarks = await Bookmark.find({ user: req.dbUser._id })
      .populate({ path: 'tuition', populate: { path: 'createdBy', select: 'name photo' } })
      .sort({ createdAt: -1 });
    res.json(bookmarks);
  } catch (err) {
    next(err);
  }
});

router.get('/check', async (req, res, next) => {
  try {
    const ids = [].concat(req.query.tuitionIds || []).filter(Boolean);
    if (!ids.length) return res.json([]);
    const bookmarks = await Bookmark.find({ user: req.dbUser._id, tuition: { $in: ids } });
    res.json(bookmarks.map((b) => b.tuition.toString()));
  } catch (err) {
    next(err);
  }
});

export default router;
