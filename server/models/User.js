import mongoose from 'mongoose';

const { Schema } = mongoose;

// A single user document covers both roles. Tutor-specific fields
// are only filled when role === 'tutor'.
const userSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['tutor', 'seeker'], required: true },
    phone: { type: String, default: '' },
    photo: { type: String, default: '' },
    gender: { type: String, enum: ['male', 'female', ''], default: '' },

    // ── Tutor-only profile fields ──────────────────────────────
    university: { type: String, default: '' },
    department: { type: String, default: '' },
    subjects: { type: [String], default: [] },      // e.g. ['Math', 'Physics']
    classLevels: { type: [String], default: [] },   // e.g. ['Class 9-10', 'HSC']
    preferredAreas: { type: [String], default: [] },// e.g. ['Mirpur', 'Uttara']
    expectedSalary: { type: Number, default: 0 },   // monthly, BDT
    mode: { type: String, enum: ['home', 'online', 'both', ''], default: '' },
    bio: { type: String, default: '' },

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

export default mongoose.model('User', userSchema);
