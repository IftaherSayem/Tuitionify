import { Router } from 'express';
import User from '../models/User.js';
import Tuition from '../models/Tuition.js';
import Application from '../models/Application.js';
import Bookmark from '../models/Bookmark.js';
import Report from '../models/Report.js';
import Review from '../models/Review.js';
import AdminLog from '../models/AdminLog.js';
import { verifyToken, loadUser, requireAdmin } from '../middleware/auth.js';
import { asEnum, safeSearchRegex } from '../utils/sanitize.js';
import { purgeUserData } from '../utils/accountDeletion.js';
import { admin } from '../config/firebase.js';
import { recomputeRating } from '../utils/rating.js';
import { logAdminAction } from '../utils/logger.js';

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
    // Optional text search across name/email/university/department.
    const filter = { role: 'tutor' };
    const search = safeSearchRegex(req.query.q);
    if (search) {
      filter.$or = [{ name: search }, { email: search }, { university: search }, { department: search }];
    }
    const [tutors, total] = await Promise.all([
      User.find(filter)
        .select('name email university department isVerified restricted ratingAvg createdAt')
        .sort({ isVerified: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
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
    // Optional text search across name/email/phone.
    const filter = { role: 'seeker' };
    const search = safeSearchRegex(req.query.q);
    if (search) {
      filter.$or = [{ name: search }, { email: search }, { phone: search }];
    }
    const [guardians, total] = await Promise.all([
      User.find(filter)
        .select('name email phone restricted createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ data: guardians, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/logs — audit trail of admin actions, newest first
router.get('/logs', async (req, res, next) => {
  try {
    const { page, limit, skip } = paging(req, { defaultLimit: 50, maxLimit: 200 });
    const [logs, total] = await Promise.all([
      AdminLog.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AdminLog.countDocuments(),
    ]);
    res.json({ data: logs, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/tuitions — list all tuitions with filters
router.get('/tuitions', async (req, res, next) => {
  try {
    const { page, limit, skip } = paging(req);
    const filter = {};

    const search = safeSearchRegex(req.query.q);
    if (search) {
      filter.$or = [{ title: search }, { area: search }];
    }

    // Filter by status
    if (req.query.status === 'open' || req.query.status === 'closed') {
      filter.status = req.query.status;
    }

    const [tuitions, total] = await Promise.all([
      Tuition.find(filter)
        .populate('createdBy', 'name email restricted')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Tuition.countDocuments(filter),
    ]);
    res.json({ data: tuitions, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/restrict — restrict or unrestrict any user
router.patch('/users/:id/restrict', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Every admin route runs loadUser, which 403s a restricted account — so an
    // admin who restricted themselves would lock themselves out of the panel
    // permanently, with no way back short of editing the database by hand.
    if (String(user._id) === String(req.dbUser._id) && Boolean(req.body.restricted)) {
      return res.status(400).json({ message: 'You cannot restrict your own account.' });
    }
    const wasRestricted = user.restricted;
    user.restricted = Boolean(req.body.restricted);
    await user.save();

    logAdminAction(
      user.restricted ? 'restrict_user' : 'unrestrict_user',
      req.dbUser,
      user._id,
      { targetEmail: user.email, targetRole: user.role, previousState: wasRestricted }
    );

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
    const wasVerified = tutor.isVerified;
    tutor.isVerified = Boolean(req.body.isVerified);
    await tutor.save();

    logAdminAction(
      tutor.isVerified ? 'verify_tutor' : 'unverify_tutor',
      req.dbUser,
      tutor._id,
      { tutorEmail: tutor.email, tutorName: tutor.name, previousState: wasVerified }
    );

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
      const previousStatus = report.status;
      report.status = req.body.status;
      await report.save();
      logAdminAction('update_report_status', req.dbUser, report._id, {
        previousStatus,
        newStatus: report.status,
      });
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/tuitions/:id — admin removes a tuition and its children
router.delete('/tuitions/:id', async (req, res, next) => {
  try {
    const tuition = await Tuition.findById(req.params.id);
    if (!tuition) return res.status(404).json({ message: 'Tuition not found' });

    // Same cascade as DELETE /api/tuitions/:id but available to admins
    // regardless of ownership.
    await Promise.all([
      Application.deleteMany({ tuition: tuition._id }),
      Bookmark.deleteMany({ tuition: tuition._id }),
      Report.deleteMany({ targetType: 'tuition', targetId: tuition._id }),
    ]);

    logAdminAction('delete_tuition', req.dbUser, tuition._id, {
      tuitionTitle: tuition.title,
      tuitionOwner: tuition.createdBy,
    });

    await tuition.deleteOne();
    res.json({ message: 'Tuition deleted by admin' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id — admin deletes a user account and all data
router.delete('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (String(user._id) === String(req.dbUser._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account from the admin panel.' });
    }

    logAdminAction('delete_user', req.dbUser, user._id, {
      targetEmail: user.email,
      targetRole: user.role,
    });

    const removed = await purgeUserData(user._id);

    let authRemoved = true;
    try {
      await admin.auth().deleteUser(user.firebaseUid);
    } catch (err) {
      if (err?.code !== 'auth/user-not-found') {
        authRemoved = false;
        console.error(
          '✗ Admin-initiated account purge: Firebase login remains —',
          user.firebaseUid,
          err?.code || err?.message,
        );
      }
    }

    res.json({ message: 'User account deleted by admin', authRemoved, removed });
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
