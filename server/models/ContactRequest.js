import mongoose from 'mongoose';

const { Schema } = mongoose;

// A seeker asks a tutor to share contact details. The tutor's phone/email
// are only revealed to the seeker once status === 'approved'.
const contactRequestSchema = new Schema(
  {
    tutor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seeker: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
  },
  { timestamps: true }
);

// A seeker can have only one active request per tutor.
contactRequestSchema.index({ tutor: 1, seeker: 1 }, { unique: true });

export default mongoose.model('ContactRequest', contactRequestSchema);
