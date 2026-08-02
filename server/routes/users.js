import { Router } from 'express';
import User from '../models/User.js';
import Review from '../models/Review.js';
import ContactRequest from '../models/ContactRequest.js';
import { verifyToken, loadUser, optionalAuth } from '../middleware/auth.js';
import { asString, asNumber, asEnum, safeSearchRegex } from '../utils/sanitize.js';
import { hasEngagement } from '../utils/engagement.js';
import { rateLimit } from '../middleware/rateLimit.js';

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

    const { name, role, phone, photo, gender } = req.body;
    if (!role || !['tutor', 'seeker'].includes(role)) {
      return res.status(400).json({ message: 'A valid role (tutor or seeker) is required' });
    }

    // Only these tutor fields may be set by the client. Never spread req.body:
    // trust fields (email, isVerified, emailVerified, restricted, ratingAvg)
    // are derived from the verified token or granted by an admin.
    const TUTOR_FIELDS = [
      'university', 'department', 'subjects', 'classLevels',
      'preferredAreas', 'expectedSalary', 'mode', 'bio',
    ];
    const tutorFields = {};
    if (role === 'tutor') {
      for (const key of TUTOR_FIELDS) {
        if (req.body[key] !== undefined) tutorFields[key] = req.body[key];
      }
    }

    if (!email) {
      return res.status(400).json({ message: 'Your account has no email address' });
    }

    user = await User.create({
      firebaseUid: uid,
      email, // always from the verified Firebase token — admin access keys off this
      name: name || tokenName || 'User',
      role,
      phone: phone || '',
      photo: photo || '',
      gender: gender || '',
      emailVerified: Boolean(email_verified),
      ...tutorFields,
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

    // All values forced to scalars — `?area[$ne]=x` would otherwise inject
    // a Mongo operator into the filter.
    // Accept multi-select (subjects[]=a&subjects[]=b) or legacy single `subject`.
    const subjectList = []
      .concat(subjects || subject || [])
      .map(asString)
      .filter(Boolean);
    if (subjectList.length) filter.subjects = { $in: subjectList };
    if (asString(classLevel)) filter.classLevels = asString(classLevel);
    if (asString(area)) filter.preferredAreas = asString(area);
    if (asEnum(gender, ['male', 'female'])) filter.gender = asEnum(gender, ['male', 'female']);
    if (asEnum(mode, ['home', 'online'])) {
      filter.mode = { $in: [asEnum(mode, ['home', 'online']), 'both'] };
    }

    const min = asNumber(minSalary);
    const max = asNumber(maxSalary);
    if (min !== null || max !== null) {
      filter.expectedSalary = {};
      if (min !== null) filter.expectedSalary.$gte = min;
      if (max !== null) filter.expectedSalary.$lte = max;
    }

    const rating = asNumber(minRating);
    if (rating !== null) filter.ratingAvg = { $gte: rating };

    const search = safeSearchRegex(q);
    if (search) {
      filter.$or = [{ name: search }, { university: search }, { department: search }, { subjects: search }];
    }
    if (asString(req.query.verified) === 'true') filter.isVerified = true;

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
    let canReview = false;    // may this viewer post a review for this tutor?
    if (req.dbUser) {
      if (String(req.dbUser._id) === String(tutor._id)) {
        revealContact = true; // tutor viewing themselves
      } else if (req.dbUser.role === 'seeker') {
        const cr = await ContactRequest.findOne({ tutor: tutor._id, seeker: req.dbUser._id });
        requestStatus = cr ? cr.status : 'none';
        revealContact = cr?.status === 'approved';
        // Mirrors the rule POST /api/reviews enforces, so the client can hide
        // the review form instead of letting the user write one and be
        // rejected on submit.
        canReview = await hasEngagement(req.dbUser._id, tutor._id);
      }
    }

    // Newest 20 inline; reviewTotal lets the client say "showing 20 of N"
    // and fall back to GET /api/reviews/tutor/:id for the rest.
    const REVIEW_PREVIEW = 20;
    const [reviews, reviewTotal] = await Promise.all([
      Review.find({ tutor: tutor._id }).sort({ createdAt: -1 }).limit(REVIEW_PREVIEW),
      Review.countDocuments({ tutor: tutor._id }),
    ]);
    res.json({
      tutor: publicTutor(tutor, { revealContact }),
      reviews,
      reviewTotal,
      requestStatus,
      canReview,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
