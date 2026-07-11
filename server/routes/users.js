import { Router } from 'express';
import User from '../models/User.js';
import Review from '../models/Review.js';
import ContactRequest from '../models/ContactRequest.js';
import { verifyToken, loadUser, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Fields that are private and must never appear in public listings.
const PRIVATE_FIELDS = '-phone -email';

// Returns a plain tutor object with contact fields removed unless the
// viewer is allowed to see them (the tutor themselves, or a seeker whose
// contact request has been approved).
function publicTutor(tutorDoc, { revealContact = false } = {}) {
  const obj = tutorDoc.toObject ? tutorDoc.toObject() : { ...tutorDoc };
  if (!revealContact) {
    delete obj.phone;
    delete obj.email;
  }
  obj.contactVisible = revealContact;
  return obj;
}

// POST /api/users/register
// Called right after Firebase signup/login to create or fetch the
// Mongo profile. Picks up name/email/uid from the verified token.
router.post('/register', verifyToken, async (req, res, next) => {
  try {
    const { uid, email, name: tokenName, email_verified } = req.firebaseUser;
    let user = await User.findOne({ firebaseUid: uid });

    if (user) return res.json(user); // already registered

    const { name, role, phone, photo, gender, ...tutorFields } = req.body;
    if (!role || !['tutor', 'seeker'].includes(role)) {
      return res.status(400).json({ message: 'A valid role (tutor or seeker) is required' });
    }

    user = await User.create({
      firebaseUid: uid,
      email: email || req.body.email,
      name: name || tokenName || 'User',
      role,
      phone: phone || '',
      photo: photo || '',
      gender: gender || '',
      emailVerified: Boolean(email_verified),
      ...(role === 'tutor' ? tutorFields : {}),
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me — current logged-in profile.
// Keeps emailVerified in sync with the latest Firebase token.
router.get('/me', verifyToken, loadUser, async (req, res, next) => {
  try {
    const verified = Boolean(req.firebaseUser.email_verified);
    if (req.dbUser.emailVerified !== verified) {
      req.dbUser.emailVerified = verified;
      await req.dbUser.save();
    }
    const admins = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = admins.includes(req.dbUser.email.toLowerCase());
    res.json({ ...req.dbUser.toObject(), isAdmin });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/me — update own profile
router.put('/me', verifyToken, loadUser, async (req, res, next) => {
  try {
    const editable = [
      'name', 'phone', 'photo', 'gender', 'university', 'department',
      'subjects', 'classLevels', 'preferredAreas', 'expectedSalary', 'mode', 'bio',
    ];
    for (const key of editable) {
      if (key in req.body) req.dbUser[key] = req.body[key];
    }
    await req.dbUser.save();
    res.json(req.dbUser);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/tutors — public, filterable tutor directory
router.get('/tutors', async (req, res, next) => {
  try {
    const { subject, subjects, classLevel, area, gender, mode, minSalary, maxSalary, minRating, q } = req.query;
    const filter = { role: 'tutor' };

    // Accept multi-select (subjects[]=a&subjects[]=b) or legacy single `subject`.
    const subjectList = [].concat(subjects || subject || []).filter(Boolean);
    if (subjectList.length) filter.subjects = { $in: subjectList };
    if (classLevel) filter.classLevels = classLevel;
    if (area) filter.preferredAreas = area;
    if (gender) filter.gender = gender;
    if (mode) filter.mode = { $in: [mode, 'both'] };
    if (minSalary || maxSalary) {
      filter.expectedSalary = {};
      if (minSalary) filter.expectedSalary.$gte = Number(minSalary);
      if (maxSalary) filter.expectedSalary.$lte = Number(maxSalary);
    }
    if (minRating) filter.ratingAvg = { $gte: Number(minRating) };
    if (q) {
      const re = { $regex: q, $options: 'i' };
      filter.$or = [{ name: re }, { university: re }, { department: re }, { subjects: re }];
    }
    if (req.query.verified === 'true') filter.isVerified = true;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const skip = (page - 1) * limit;

    const [tutors, total] = await Promise.all([
      User.find(filter)
        .select(PRIVATE_FIELDS)
        .sort({ isVerified: -1, ratingAvg: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ data: tutors, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/tutors/:id — single tutor + reviews.
// Contact details are only included when the viewer is the tutor, or a
// seeker with an approved contact request. optionalAuth = works logged-out.
router.get('/tutors/:id', optionalAuth, async (req, res, next) => {
  try {
    const tutor = await User.findOne({ _id: req.params.id, role: 'tutor' });
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    // Decide whether this viewer may see contact info.
    let revealContact = false;
    let requestStatus = null; // 'none' | 'pending' | 'approved' | 'declined'
    if (req.dbUser) {
      if (String(req.dbUser._id) === String(tutor._id)) {
        revealContact = true; // tutor viewing themselves
      } else if (req.dbUser.role === 'seeker') {
        const cr = await ContactRequest.findOne({ tutor: tutor._id, seeker: req.dbUser._id });
        requestStatus = cr ? cr.status : 'none';
        revealContact = cr?.status === 'approved';
      }
    }

    const reviews = await Review.find({ tutor: tutor._id }).sort({ createdAt: -1 });
    res.json({ tutor: publicTutor(tutor, { revealContact }), reviews, requestStatus });
  } catch (err) {
    next(err);
  }
});

export default router;
