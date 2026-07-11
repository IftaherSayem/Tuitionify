import { Schema, model } from 'mongoose';

const bookmarkSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tuition: { type: Schema.Types.ObjectId, ref: 'Tuition', required: true },
  },
  { timestamps: true },
);

bookmarkSchema.index({ user: 1, tuition: 1 }, { unique: true });

export default model('Bookmark', bookmarkSchema);
