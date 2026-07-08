import mongoose from 'mongoose';

const { Schema } = mongoose;

// A tutor applying to a posted tuition.
const applicationSchema = new Schema(
  {
    tuition: { type: Schema.Types.ObjectId, ref: 'Tuition', required: true, index: true },
    tutor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

// A tutor may apply to a given tuition only once.
applicationSchema.index({ tuition: 1, tutor: 1 }, { unique: true });

export default mongoose.model('Application', applicationSchema);
