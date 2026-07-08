import { Router } from 'express';
import Report from '../models/Report.js';
import { verifyToken, loadUser } from '../middleware/auth.js';

const router = Router();

// POST /api/reports — any logged-in user flags a profile or tuition
router.post('/', verifyToken, loadUser, async (req, res, next) => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    if (!['user', 'tuition'].includes(targetType)) {
      return res.status(400).json({ message: 'Invalid target type' });
    }
    if (!targetId || !reason) {
      return res.status(400).json({ message: 'targetId and reason are required' });
    }
    const report = await Report.create({
      reporter: req.dbUser._id,
      targetType,
      targetId,
      reason,
      details: details || '',
    });
    res.status(201).json({ message: 'Report submitted. Thank you for helping keep Tuitionify safe.', id: report._id });
  } catch (err) {
    next(err);
  }
});

export default router;
