import mongoose from 'mongoose';

const { Schema } = mongoose;

// A durable record of an admin mutation (verify, restrict, delete, report
// status change). Written alongside the Winston console log so the audit trail
// survives as long as the data does — console/file logs can be rotated away or
// lost in a serverless restart, but this is the record of record.
const adminLogSchema = new Schema(
  {
    action: { type: String, required: true, index: true }, // e.g. 'restrict_user'
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorEmail: { type: String, required: true },
    // The target may be a User, Tuition, Report, etc. — kept as a loose id
    // (not a ref) because the type varies and the target may be deleted after.
    targetId: { type: Schema.Types.ObjectId, index: true },
    targetEmail: { type: String, default: '' },
    targetRole: { type: String, default: '' },
    // Free-form extras (previousState, tuitionTitle, etc.) — flattened to
    // top-level string fields where relevant, otherwise kept here as a small doc.
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('AdminLog', adminLogSchema);
