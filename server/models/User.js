import mongoose from 'mongoose';
import { normalizeBdPhone, isValidOrEmptyBdPhone } from '../utils/phone.js';
import { SUBJECTS, CLASS_LEVELS, AREAS, SALARY_MAX, allIn } from '../utils/options.js';

const { Schema } = mongoose;

// A single user document covers both roles. Tutor-specific fields
// are only filled when role === 'tutor'.
const userSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['tutor', 'seeker'], required: true },
    // Stored as bare 11-digit `01XXXXXXXXX`. Guardians dial these by hand, so
    // the setter normalises the many ways people write a BD number (+88…,
    // 88…, spaces, dashes) down to one canonical form.
    phone: {
      type: String,
      default: '',
      set: normalizeBdPhone,
      validate: {
        validator: isValidOrEmptyBdPhone,
        message: 'Enter a valid Bangladeshi mobile number, e.g. 01712345678',
      },
    },
    // Must be an absolute http(s) URL — the value is rendered as an <img src>,
    // so this keeps data:/javascript: and other schemes out of the field.
    photo: {
      type: String,
      default: '',
      validate: {
        validator: (v) => !v || /^https?:\/\//i.test(v),
        message: 'photo must be an http(s) URL',
      },
    },
    gender: { type: String, enum: ['male', 'female', ''], default: '' },

    // ── Tutor-only profile fields ──────────────────────────────
    university: { type: String, default: '', maxlength: 150 },
    department: { type: String, default: '', maxlength: 150 },
    subjects: { type: [String], default: [] },      // e.g. ['Math', 'Physics']
    classLevels: { type: [String], default: [] },   // e.g. ['Class 9-10', 'HSC']
    preferredAreas: { type: [String], default: [] },// e.g. ['Mirpur', 'Uttara']
    expectedSalary: { type: Number, default: 0, min: 0, max: SALARY_MAX },   // monthly, BDT
    mode: { type: String, enum: ['home', 'online', 'both', ''], default: '' },
    bio: { type: String, default: '', maxlength: 2000 },

    // Denormalised review aggregates for fast listing.
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    // Trust & safety. isVerified is granted by an admin after checking a
    // student ID; emailVerified mirrors Firebase's email verification.
    isVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    restricted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// The multi-select tutor fields come straight from the client, so bound both
// their size and their contents. Unrecognised values would otherwise pollute
// the filter dropdowns and make a tutor unfindable by the very filters the UI
// offers, since a listing search matches on these exact strings.
const LIST_FIELDS = {
  subjects: SUBJECTS,
  classLevels: CLASS_LEVELS,
  preferredAreas: AREAS,
};

for (const [field, allowed] of Object.entries(LIST_FIELDS)) {
  userSchema.path(field).validate(
    (v) => !v || v.length <= 50,
    `${field} cannot have more than 50 entries`,
  );
  userSchema.path(field).validate(
    (v) => allIn(v || [], allowed),
    `${field} contains a value that is not an option`,
  );
}

export default mongoose.model('User', userSchema);
