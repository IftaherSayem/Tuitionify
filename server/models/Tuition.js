import mongoose from 'mongoose';

const { Schema } = mongoose;

// A tuition request posted by a seeker (guardian/student).
const tuitionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    classLevel: { type: String, required: true }, // BD system, e.g. 'Class 8', 'HSC'
    subjects: { type: [String], required: true },
    area: { type: String, required: true },       // thana / area, e.g. 'Dhanmondi'
    salary: { type: Number, required: true },      // monthly, BDT
    daysPerWeek: { type: Number, default: 3 },
    mode: { type: String, enum: ['home', 'online'], default: 'home' },
    genderPreference: { type: String, enum: ['male', 'female', 'any'], default: 'any' },
    description: { type: String, default: '' },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Tuition', tuitionSchema);
