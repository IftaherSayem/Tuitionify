import { Router } from 'express';
import User from '../models/User.js';
import Tuition from '../models/Tuition.js';
import Application from '../models/Application.js';
import Report from '../models/Report.js';
import { verifyToken, loadUser, requireAdmin } from '../middleware/auth.js';
import { asEnum } from '../utils/sanitize.js';

const router = Router();

// All routes here require an admin (email listed in ADMIN_EMAILS).
router.use(verifyToken, loadUser, requireAdmin);

// Shared paging for the admin tables. Same shape the public listings return,
// so the client can reuse its Pagination component.
function paging(req, { defaultLimit = 25, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

// GET /api/admin/tutors — list tutors with verification and restriction status
router.get('/tutors', async (req, res, next) => {
  try {
    const { page, limit, skip } = paging(req);
    const [tutors, total] = await Promise.all([
      User.find({ role: 'tutor' })
        .select('name email university department isVerified restricted ratingAvg createdAt')
        .sort({ isVerified: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ role: 'tutor' }),
    ]);
    res.json({ data: tutors, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/guardians — list seekers (guardians)
router.get('/guardians', async (req, res, next) => {
  try {
    const { page, limit, skip } = paging(req);
    const [guardians, total] = await Promise.all([
      User.find({ role: 'seeker' })
        .select('name email phone restricted createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ role: 'seeker' }),
    ]);
    res.json({ data: guardians, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/restrict — restrict or unrestrict any user
router.patch('/users/:id/restrict', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.restricted = Boolean(req.body.restricted);
    await user.save();
    res.json({ _id: user._id, restricted: user.restricted });
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
    // Whitelisted rather than passed through: `?status[$ne]=open` would
    // otherwise reach Mongo as an operator instead of a value.
    const status = asEnum(req.query.status, ['open', 'reviewed', 'dismissed']);
    const filter = status ? { status } : {};
    const { page, limit, skip } = paging(req);
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('reporter', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(filter),
    ]);
    res.json({ data: reports, page, totalPages: Math.ceil(total / limit), total });
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

// GET /api/admin/analytics — dashboard statistics
router.get('/analytics', async (req, res, next) => {
  try {
    const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, totalTutors, totalSeekers,
      totalTuitions, openTuitions, closedTuitions,
      totalApplications, pendingApps, acceptedApps, rejectedApps,
      signupsPerWeek, tuitionsPerWeek, topSubjects, topAreas,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'tutor' }),
      User.countDocuments({ role: 'seeker' }),
      Tuition.countDocuments(),
      Tuition.countDocuments({ status: 'open' }),
      Tuition.countDocuments({ status: 'closed' }),
      Application.countDocuments(),
      Application.countDocuments({ status: 'pending' }),
      Application.countDocuments({ status: 'accepted' }),
      Application.countDocuments({ status: 'rejected' }),
      User.aggregate([
        { $match: { createdAt: { $gte: eightWeeksAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%U', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Tuition.aggregate([
        { $match: { createdAt: { $gte: eightWeeksAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%U', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Tuition.aggregate([
        { $unwind: '$subjects' },
        { $group: { _id: '$subjects', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Tuition.aggregate([
        { $group: { _id: '$area', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({
      counts: {
        users: { total: totalUsers, tutors: totalTutors, seekers: totalSeekers },
        tuitions: { total: totalTuitions, open: openTuitions, closed: closedTuitions },
        applications: { total: totalApplications, pending: pendingApps, accepted: acceptedApps, rejected: rejectedApps },
      },
      signupsPerWeek: signupsPerWeek.map((w) => ({ week: w._id, count: w.count })),
      tuitionsPerWeek: tuitionsPerWeek.map((w) => ({ week: w._id, count: w.count })),
      topSubjects: topSubjects.map((s) => ({ name: s._id, count: s.count })),
      topAreas: topAreas.map((a) => ({ name: a._id, count: a.count })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
