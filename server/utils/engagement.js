import Tuition from '../models/Tuition.js';
import Application from '../models/Application.js';
import ContactRequest from '../models/ContactRequest.js';

// Did this seeker actually engage this tutor?
//
// A review is only credible if there was a real interaction, and ratingAvg is
// the primary sort key of the public tutor directory — so without this check
// any free account could move a tutor up or down the listings.
//
// Two proofs count, and both require an action by the tutor or by the seeker
// on their own post, so a seeker cannot manufacture either one alone:
//   1. the tutor was accepted on one of the seeker's own tuitions, or
//   2. the tutor approved the seeker's contact request.
export async function hasEngagement(seekerId, tutorId) {
  const myTuitionIds = await Tuition.find({ createdBy: seekerId }).distinct('_id');

  if (myTuitionIds.length) {
    const accepted = await Application.exists({
      tutor: tutorId,
      tuition: { $in: myTuitionIds },
      status: 'accepted',
    });
    if (accepted) return true;
  }

  return Boolean(
    await ContactRequest.exists({
      tutor: tutorId,
      seeker: seekerId,
      status: 'approved',
    }),
  );
}
