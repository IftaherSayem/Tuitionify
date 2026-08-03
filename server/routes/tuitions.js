import { Router } from 'express';
import Tuition from '../models/Tuition.js';
import Application from '../models/Application.js';
import Bookmark from '../models/Bookmark.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { verifyToken, loadUser, requireRole, optionalAuth } from '../middleware/auth.js';
import { asString, asNumber, asEnum, safeSearchRegex } from '../utils/sanitize.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

// `restricted` lives on User, not Tuition, so a public tuition query cannot
// filter on it directly. Looking the ids up per request (rather than caching or
// denormalising a flag onto Tuition) keeps restrict/unrestrict effective
// immediately with no backfill.
async function restrictedOwnerIds() {
  const users = await User.find({ restricted: true }).select('_id').lean();
  return users.map((u) => u._id);
}

// GET /api/tuitions — public, filterable list of open tuitions
router.get('/', async (req, res, next) => {
  try {
    const { subject, subjects, classLevel, area, gender, mode, minSalary, maxSalary, status } = req.query;
    const filter = {};
    // Every value below is forced to a scalar: Express turns `?area[$ne]=x`
    // into an object, which would otherwise inject a Mongo operator.
    filter.status = asEnum(status, ['open', 'closed']) || 'open';

    // Accept multi-select (subjects[]=a&subjects[]=b) or legacy single `subject`.
    const subjectList = []
      .concat(subjects || subject || [])
      .map(asString)
      .filter(Boolean);
    if (subjectList.length) filter.subjects = { $in: subjectList };
    if (asString(classLevel)) filter.classLevel = asString(classLevel);
    if (asString(area)) filter.area = asString(area);
    if (asEnum(gender, ['male', 'female'])) {
      filter.genderPreference = { $in: [asEnum(gender, ['male', 'female']), 'any'] };
    }
    if (asEnum(mode, ['home', 'online'])) filter.mode = asEnum(mode, ['home', 'online']);

    const min = asNumber(minSalary);
    const max = asNumber(maxSalary);
    if (min !== null || max !== null) {
      filter.salary = {};
      if (min !== null) filter.salary.$gte = min;
      if (max !== null) filter.salary.$lte = max;
    }

    const search = safeSearchRegex(req.query.q);
    if (search) {
      filter.$or = [{ title: search }, { description: search }, { subjects: search }];
    }

    // Posts by a restricted guardian drop out of the public list, so a ban
    // removes their listings instead of leaving them open to applications.
    const banned = await restrictedOwnerIds();
    if (banned.length) filter.createdBy = { $nin: banned };

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

// GET /api/tuitions/recommended — tuition recommendations for a tutor
router.get('/recommended', verifyToken, loadUser, async (req, res, next) => {
  try {
    if (req.dbUser.role !== 'tutor') return res.json([]);
    const { subjects = [], preferredAreas = [], classLevels = [] } = req.dbUser;
    if (!subjects.length && !preferredAreas.length && !classLevels.length) return res.json([]);

    const filter = { status: 'open', $or: [] };
    if (subjects.length) filter.$or.push({ subjects: { $in: subjects } });
    if (preferredAreas.length) filter.$or.push({ area: { $in: preferredAreas } });
    if (classLevels.length) filter.$or.push({ classLevel: { $in: classLevels } });

    const banned = await restrictedOwnerIds();
    if (banned.length) filter.createdBy = { $nin: banned };

    const tuitions = await Tuition.find(filter)
      .populate('createdBy', 'name photo')
      .sort({ createdAt: -1 })
      .limit(20);

    const scored = tuitions.map((t) => {
      let score = 0;
      if (subjects.some((s) => t.subjects.includes(s))) score += 2;
      if (preferredAreas.includes(t.area)) score += 1;
      if (classLevels.includes(t.classLevel)) score += 1;
      return { tuition: t, score };
    });
    scored.sort((a, b) => b.score - a.score);
    res.json(scored.slice(0, 6).map((s) => s.tuition));
  } catch (err) {
    next(err);
  }
});

// GET /api/tuitions/:id — single tuition
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const tuition = await Tuition.findById(req.params.id).populate('createdBy', 'name photo phone restricted firebaseUid');
    if (!tuition) return res.status(404).json({ message: 'Tuition not found' });

    const obj = tuition.toObject();
    // The poster's phone is private — only the owner may see it. The client
    // also hides it, but that check is cosmetic; this is the real guard.
    const isOwner = req.dbUser && String(tuition.createdBy?._id) === String(req.dbUser._id);
    // Separate from isOwner above: optionalAuth leaves req.dbUser unset for a
    // restricted user, so a banned poster needs the token's uid to still reach
    // their own post. Filtering the list alone would leave direct links live.
    const isSelf = Boolean(req.firebaseUser?.uid) && obj.createdBy?.firebaseUid === req.firebaseUser.uid;
    if (obj.createdBy?.restricted && !isSelf) {
      return res.status(404).json({ message: 'Tuition not found' });
    }

    if (obj.createdBy) {
      delete obj.createdBy.restricted;
      delete obj.createdBy.firebaseUid;
      if (!isOwner) delete obj.createdBy.phone;
    }

    res.json(obj);
  } catch (err) {
    next(err);
  }
});

// POST /api/tuitions — seeker posts a tuition
router.post('/', verifyToken, loadUser, requireRole('seeker'), rateLimit({ windowMs: 60_000, max: 10, name: 'post-tuition' }), async (req, res, next) => {
  try {
    // Whitelist, so a caller cannot set server-controlled fields
    // (status, createdBy, timestamps) by spreading extra keys.
    const CREATABLE = [
      'title', 'classLevel', 'subjects', 'area', 'salary',
      'daysPerWeek', 'mode', 'genderPreference', 'description',
    ];
    const payload = {};
    for (const key of CREATABLE) {
      if (req.body[key] !== undefined) payload[key] = req.body[key];
    }

    const tuition = await Tuition.create({ ...payload, createdBy: req.dbUser._id });
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
    const nextStatus = req.body.status === 'closed' ? 'closed' : 'open';

    // Reopening a post that already has an accepted tutor would leave that
    // tutor holding an "accepted" application for a live listing, and invite
    // a second acceptance for the same slot. Make the seeker reject the
    // standing applicant first, so the tutor sees the decision.
    if (nextStatus === 'open' && tuition.status === 'closed') {
      const accepted = await Application.exists({ tuition: tuition._id, status: 'accepted' });
      if (accepted) {
        return res.status(409).json({
          message: 'You already accepted a tutor for this tuition. Reject that applicant first if you want to reopen it.',
        });
      }
    }

    tuition.status = nextStatus;
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

    // Auto-mark unviewed applications as viewed
    const unviewed = applications.filter((a) => !a.viewedAt);
    if (unviewed.length) {
      const now = new Date();
      await Application.updateMany(
        { _id: { $in: unviewed.map((a) => a._id) } },
        { $set: { viewedAt: now } },
      );
      unviewed.forEach((a) => { a.viewedAt = now; });
    }

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
