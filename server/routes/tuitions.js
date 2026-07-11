import { Router } from 'express';
import Tuition from '../models/Tuition.js';
import Application from '../models/Application.js';
import Bookmark from '../models/Bookmark.js';
import Report from '../models/Report.js';
import { verifyToken, loadUser, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/tuitions — public, filterable list of open tuitions
router.get('/', async (req, res, next) => {
  try {
    const { subject, subjects, classLevel, area, gender, mode, minSalary, maxSalary, status } = req.query;
    const filter = {};
    filter.status = status || 'open';

    // Accept multi-select (subjects[]=a&subjects[]=b) or legacy single `subject`.
    const subjectList = [].concat(subjects || subject || []).filter(Boolean);
    if (subjectList.length) filter.subjects = { $in: subjectList };
    if (classLevel) filter.classLevel = classLevel;
    if (area) filter.area = area;
    if (gender) filter.genderPreference = { $in: [gender, 'any'] };
    if (mode) filter.mode = mode;
    if (minSalary || maxSalary) {
      filter.salary = {};
      if (minSalary) filter.salary.$gte = Number(minSalary);
      if (maxSalary) filter.salary.$lte = Number(maxSalary);
    }

    if (req.query.q) {
      const re = { $regex: req.query.q, $options: 'i' };
      filter.$or = [{ title: re }, { description: re }, { subjects: re }];
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const skip = (page - 1) * limit;

    const [tuitions, total] = await Promise.all([
      Tuition.find(filter)
        .populate('createdBy', 'name photo')
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

// GET /api/tuitions/mine/posted — seeker's own posts (must be before /:id)
router.get('/mine/posted', verifyToken, loadUser, async (req, res, next) => {
  try {
    const tuitions = await Tuition.find({ createdBy: req.dbUser._id }).sort({ createdAt: -1 });
    res.json(tuitions);
  } catch (err) {
    next(err);
  }
});

// GET /api/tuitions/:id — single tuition
router.get('/:id', async (req, res, next) => {
  try {
    const tuition = await Tuition.findById(req.params.id).populate('createdBy', 'name photo phone');
    if (!tuition) return res.status(404).json({ message: 'Tuition not found' });
    res.json(tuition);
  } catch (err) {
    next(err);
  }
});

// POST /api/tuitions — seeker posts a tuition
router.post('/', verifyToken, loadUser, requireRole('seeker'), async (req, res, next) => {
  try {
    const tuition = await Tuition.create({ ...req.body, createdBy: req.dbUser._id });
    res.status(201).json(tuition);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tuitions/:id/status — open/close own tuition
router.patch('/:id/status', verifyToken, loadUser, async (req, res, next) => {
  try {
    const tuition = await Tuition.findById(req.params.id);
    if (!tuition) return res.status(404).json({ message: 'Tuition not found' });
    if (String(tuition.createdBy) !== String(req.dbUser._id)) {
      return res.status(403).json({ message: 'Not your tuition' });
    }
    tuition.status = req.body.status === 'closed' ? 'closed' : 'open';
    await tuition.save();
    res.json(tuition);
  } catch (err) {
    next(err);
  }
});

// GET /api/tuitions/:id/applications — seeker views applicants for own tuition
router.get('/:id/applications', verifyToken, loadUser, async (req, res, next) => {
  try {
    const tuition = await Tuition.findById(req.params.id);
    if (!tuition) return res.status(404).json({ message: 'Tuition not found' });
    if (String(tuition.createdBy) !== String(req.dbUser._id)) {
      return res.status(403).json({ message: 'Not your tuition' });
    }
    const applications = await Application.find({ tuition: tuition._id })
      .populate('tutor', 'name photo university department subjects ratingAvg ratingCount expectedSalary phone')
      .sort({ createdAt: -1 });
    // Contact (phone) is only shared once the applicant is accepted.
    const sanitized = applications.map((a) => {
      const obj = a.toObject();
      if (obj.status !== 'accepted' && obj.tutor) delete obj.tutor.phone;
      return obj;
    });
    res.json(sanitized);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tuitions/:id — edit own tuition
router.put('/:id', verifyToken, loadUser, async (req, res, next) => {
  try {
    const tuition = await Tuition.findById(req.params.id);
    if (!tuition) return res.status(404).json({ message: 'Tuition not found' });
    if (String(tuition.createdBy) !== String(req.dbUser._id)) {
      return res.status(403).json({ message: 'Not your tuition' });
    }

    const allowed = ['title', 'classLevel', 'subjects', 'area', 'salary', 'daysPerWeek', 'mode', 'genderPreference', 'description'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) tuition[key] = req.body[key];
    });
    await tuition.save();
    res.json(tuition);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tuitions/:id — delete own tuition with cascade
router.delete('/:id', verifyToken, loadUser, async (req, res, next) => {
  try {
    const tuition = await Tuition.findById(req.params.id);
    if (!tuition) return res.status(404).json({ message: 'Tuition not found' });
    if (String(tuition.createdBy) !== String(req.dbUser._id)) {
      return res.status(403).json({ message: 'Not your tuition' });
    }

    await Promise.all([
      Application.deleteMany({ tuition: tuition._id }),
      Bookmark.deleteMany({ tuition: tuition._id }),
      Report.deleteMany({ targetType: 'tuition', targetId: tuition._id }),
    ]);
    await tuition.deleteOne();
    res.json({ message: 'Tuition deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
