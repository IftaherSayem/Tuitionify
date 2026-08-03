import { Router } from 'express';
import Application from '../models/Application.js';
import Tuition from '../models/Tuition.js';
import { verifyToken, loadUser, requireRole } from '../middleware/auth.js';
import { isValidBdPhone } from '../utils/phone.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

// POST /api/applications — tutor applies to a tuition
router.post('/', verifyToken, loadUser, requireRole('tutor'), rateLimit({ windowMs: 3_600_000, max: 30, name: 'apply' }), async (req, res, next) => {
  try {
    // Hiring here ends on a phone call — a guardian who accepts a tutor with
    // no number has no way to reach them, and the application is dead weight
    // in their applicant list. Require it at the point it starts to matter
    // rather than forcing every browsing tutor to fill in a profile.
    if (!isValidBdPhone(req.dbUser.phone)) {
      return res.status(400).json({
        message: 'Add your mobile number to your profile before applying — guardians contact tutors by phone.',
      });
    }

    const { tuitionId, message } = req.body;
    const tuition = await Tuition.findById(tuitionId).populate('createdBy', 'restricted');
    if (!tuition) return res.status(404).json({ message: 'Tuition not found' });
    if (tuition.status !== 'open') {
      return res.status(400).json({ message: 'This tuition is closed' });
    }
    // Hiding the post from the listings is not enough on its own — this is the
    // route that actually costs the tutor something, since a restricted
    // guardian can never log in to read or accept the application.
    if (tuition.createdBy?.restricted) {
      return res.status(403).json({ message: 'This tuition is no longer accepting applications' });
    }

    const application = await Application.create({
      tuition: tuition._id,
      tutor: req.dbUser._id,
      message: message || '',
    });
    res.status(201).json(application);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already applied to this tuition' });
    }
    next(err);
  }
});

// GET /api/applications/mine — tutor's own applications
router.get('/mine', verifyToken, loadUser, requireRole('tutor'), async (req, res, next) => {
  try {
    const apps = await Application.find({ tutor: req.dbUser._id })
      .populate({
        path: 'tuition',
        populate: { path: 'createdBy', select: 'name photo' },
      })
      .sort({ createdAt: -1 });
    res.json(apps);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/applications/:id — seeker accepts/rejects an application
router.patch('/:id', verifyToken, loadUser, async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id).populate('tuition');
    if (!app) return res.status(404).json({ message: 'Application not found' });
    if (String(app.tuition.createdBy) !== String(req.dbUser._id)) {
      return res.status(403).json({ message: 'Not your tuition' });
    }
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be accepted or rejected' });
    }
    app.status = status;
    app.decidedAt = new Date();
    await app.save();

    // Accepting an applicant closes the tuition.
    if (status === 'accepted') {
      app.tuition.status = 'closed';
      await app.tuition.save();
    }
    res.json(app);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/applications/:id — tutor withdraws their own application.
// Only while it is still pending: once a guardian has accepted or rejected,
// the outcome is part of their record and the tuition may already be closed
// against it.
router.delete('/:id', verifyToken, loadUser, requireRole('tutor'), async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (String(application.tutor) !== String(req.dbUser._id)) {
      return res.status(403).json({ message: 'Not your application' });
    }
    if (application.status !== 'pending') {
      return res.status(400).json({
        message: `This application was already ${application.status} and cannot be withdrawn.`,
      });
    }
    await application.deleteOne();
    res.json({ message: 'Application withdrawn' });
  } catch (err) {
    next(err);
  }
});

export default router;
