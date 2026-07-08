import { Router } from 'express';
import Application from '../models/Application.js';
import Tuition from '../models/Tuition.js';
import { verifyToken, loadUser, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/applications — tutor applies to a tuition
router.post('/', verifyToken, loadUser, requireRole('tutor'), async (req, res, next) => {
  try {
    const { tuitionId, message } = req.body;
    const tuition = await Tuition.findById(tuitionId);
    if (!tuition) return res.status(404).json({ message: 'Tuition not found' });
    if (tuition.status !== 'open') {
      return res.status(400).json({ message: 'This tuition is closed' });
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

export default router;
