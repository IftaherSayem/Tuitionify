import { Schema, model } from 'mongoose';

const tutorBookmarkSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tutor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

tutorBookmarkSchema.index({ user: 1, tutor: 1 }, { unique: true });

export default model('TutorBookmark', tutorBookmarkSchema);
