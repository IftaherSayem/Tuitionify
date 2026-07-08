import mongoose from 'mongoose';

const { Schema } = mongoose;

// A user flags a suspicious profile or tuition post for admin review.
const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // What is being reported — a user profile or a tuition post.
    targetType: { type: String, enum: ['user', 'tuition'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, required: true },     // short category
    details: { type: String, default: '' },       // free text
    status: { type: String, enum: ['open', 'reviewed', 'dismissed'], default: 'open' },
  },
  { timestamps: true }
);

export default mongoose.model('Report', reportSchema);
