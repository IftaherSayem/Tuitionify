import { Router } from 'express';
import User from '../models/User.js';
import Report from '../models/Report.js';
import { verifyToken, loadUser, requireAdmin } from '../middleware/auth.js';

const router = Router();

// All routes here require an admin (email listed in ADMIN_EMAILS).
router.use(verifyToken, loadUser, requireAdmin);

// GET /api/admin/tutors — list tutors with verification status
router.get('/tutors', async (req, res, next) => {
  try {
    const tutors = await User.find({ role: 'tutor' })
      .select('name email university department isVerified ratingAvg createdAt')
      .sort({ isVerified: 1, createdAt: -1 });
    res.json(tutors);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/tutors/:id/verify — grant or revoke verified badge
router.patch('/tutors/:id/verify', async (req, res, next) => {
  try {
    const tutor = await User.findOne({ _id: req.params.id, role: 'tutor' });
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
    tutor.isVerified = Boolean(req.body.isVerified);
    await tutor.save();
    res.json({ _id: tutor._id, isVerified: tutor.isVerified });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports — list open reports
router.get('/reports', async (req, res, next) => {
  try {
    const reports = await Report.find(req.query.status ? { status: req.query.status } : {})
      .populate('reporter', 'name email')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/reports/:id — update report status
router.patch('/reports/:id', async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (['open', 'reviewed', 'dismissed'].includes(req.body.status)) {
      report.status = req.body.status;
      await report.save();
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
