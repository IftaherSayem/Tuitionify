import Application from '../models/Application.js';

// Is a tutor already holding the slot on this tuition?
//
// Accepting an applicant closes the post, but the other applicants stay
// pending, and the only unique index on Application is { tuition, tutor } —
// which stops one tutor applying twice, not one tuition accepting twice. Left
// unguarded, a second acceptance means two tutors each told the job is theirs,
// a seeker holding review rights over a tutor they never hired (hasEngagement
// matches either accepted row), and a post whose reopen guard in
// routes/tuitions.js demands two rejections while its message names one.
//
// `exceptId` skips the application being decided, so re-accepting the tutor who
// already holds the slot stays a harmless no-op instead of a conflict.
export async function hasAcceptedApplicant(tuitionId, { exceptId } = {}) {
  const filter = { tuition: tuitionId, status: 'accepted' };
  if (exceptId) filter._id = { $ne: exceptId };
  return Boolean(await Application.exists(filter));
}
