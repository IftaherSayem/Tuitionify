import { Router } from 'express';
import ContactRequest from '../models/ContactRequest.js';
import User from '../models/User.js';
import { verifyToken, loadUser, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/contact-requests — seeker asks a tutor to share contact
router.post('/', verifyToken, loadUser, requireRole('seeker'), async (req, res, next) => {
  try {
    const { tutorId, message } = req.body;
    const tutor = await User.findOne({ _id: tutorId, role: 'tutor' });
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    const request = await ContactRequest.create({
      tutor: tutor._id,
      seeker: req.dbUser._id,
      message: message || '',
    });
    res.status(201).json(request);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already requested this tutor\'s contact' });
    }
    next(err);
  }
});

// GET /api/contact-requests/incoming — tutor sees requests sent to them
router.get('/incoming', verifyToken, loadUser, requireRole('tutor'), async (req, res, next) => {
  try {
    const requests = await ContactRequest.find({ tutor: req.dbUser._id })
      .populate('seeker', 'name photo')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

// GET /api/contact-requests/mine — seeker sees their own requests
router.get('/mine', verifyToken, loadUser, requireRole('seeker'), async (req, res, next) => {
  try {
    const requests = await ContactRequest.find({ seeker: req.dbUser._id })
      .populate('tutor', 'name photo phone email')
      .sort({ createdAt: -1 });

    // Hide the tutor's contact unless that specific request was approved.
    const shaped = requests.map((r) => {
      const obj = r.toObject();
      if (obj.status !== 'approved' && obj.tutor) {
        delete obj.tutor.phone;
        delete obj.tutor.email;
      }
      return obj;
    });
    res.json(shaped);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/contact-requests/:id — tutor approves or declines
router.patch('/:id', verifyToken, loadUser, requireRole('tutor'), async (req, res, next) => {
  try {
    const request = await ContactRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (String(request.tutor) !== String(req.dbUser._id)) {
      return res.status(403).json({ message: 'Not your request' });
    }
    const { status } = req.body;
    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'status must be approved or declined' });
    }
    request.status = status;
    await request.save();
    res.json(request);
  } catch (err) {
    next(err);
  }
});

export default router;
