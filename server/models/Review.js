import mongoose from 'mongoose';

const { Schema } = mongoose;

// A review left by a seeker for a tutor.
const reviewSchema = new Schema(
  {
    tutor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true }, // snapshot for display
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
  },
  { timestamps: true }
);

// One review per seeker per tutor.
reviewSchema.index({ tutor: 1, author: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
