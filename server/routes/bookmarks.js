import { Router } from 'express';
import Bookmark from '../models/Bookmark.js';
import Tuition from '../models/Tuition.js';
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
    // Verify the tuition exists before creating a dangling bookmark.
    const tuition = await Tuition.findById(req.params.tuitionId);
    if (!tuition) return res.status(404).json({ message: 'Tuition not found' });
    await Bookmark.create({ user: req.dbUser._id, tuition: req.params.tuitionId });
    res.json({ bookmarked: true });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filter = { user: req.dbUser._id };
    const [bookmarks, total] = await Promise.all([
      Bookmark.find(filter)
        .populate({ path: 'tuition', populate: { path: 'createdBy', select: 'name photo' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Bookmark.countDocuments(filter),
    ]);
    res.json({ data: bookmarks, page, totalPages: Math.ceil(total / limit), total });
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
