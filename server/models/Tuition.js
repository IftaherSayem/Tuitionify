import mongoose from 'mongoose';
import { SUBJECTS, CLASS_LEVELS, AREAS, SALARY_MIN, SALARY_MAX, allIn } from '../utils/options.js';

const { Schema } = mongoose;

// A tuition request posted by a seeker (guardian/student).
const tuitionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    classLevel: { type: String, required: true, enum: CLASS_LEVELS }, // BD system, e.g. 'Class 9-10', 'HSC'
    subjects: { type: [String], required: true },
    area: { type: String, required: true, enum: AREAS },       // thana / area, e.g. 'Khulshi'
    salary: { type: Number, required: true, min: SALARY_MIN, max: SALARY_MAX }, // monthly, BDT
    daysPerWeek: { type: Number, default: 3, min: 1, max: 7 },
    mode: { type: String, enum: ['home', 'online'], default: 'home' },
    genderPreference: { type: String, enum: ['male', 'female', 'any'], default: 'any' },
    description: { type: String, default: '', maxlength: 3000 },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

tuitionSchema.path('subjects').validate(
  (v) => Array.isArray(v) && v.length > 0 && v.length <= 20,
  'A tuition needs between 1 and 20 subjects',
);

tuitionSchema.path('subjects').validate(
  (v) => allIn(v || [], SUBJECTS),
  'subjects contains a value that is not an option',
);

export default mongoose.model('Tuition', tuitionSchema);
