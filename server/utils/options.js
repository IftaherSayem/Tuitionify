// Allowed values for the multi-select / dropdown fields.
//
// These mirror client/src/data/options.js. They are duplicated rather than
// imported because the client and the API deploy as two separate Vercel
// projects with separate root directories — there is no shared build step, so
// a cross-directory import would resolve locally and fail in production.
//
// ⚠ If you edit client/src/data/options.js (e.g. to change city or
// curriculum), edit this file to match, or the API will reject values the UI
// happily offers.

export const CLASS_LEVELS = [
  'Class 1-5',
  'Class 6-8',
  'Class 9-10',
  'SSC',
  'HSC',
  'Admission',
  'O Level',
  'A Level',
];

export const SUBJECTS = [
  'Bangla',
  'English',
  'Math',
  'Higher Math',
  'Physics',
  'Chemistry',
  'Biology',
  'Science',
  'ICT',
  'Accounting',
  'Economics',
  'Religion',
];

// Chittagong areas / thanas (IIUC is in Kumira, Sitakunda).
export const AREAS = [
  'Kumira', 'Sitakunda', 'Bhatiari', 'Faujdarhat', 'Akbar Shah', 'Pahartali',
  'Kotwali', 'Chawkbazar', 'Anderkilla', 'Sadarghat', 'Bakalia',
  'Double Mooring', 'Agrabad', 'Dewanhat', 'Halishahar', 'Barik Building',
  'Khulshi', 'GEC', 'Nasirabad', 'Lalkhan Bazar', 'WASA',
  'Panchlaish', 'Muradpur', 'Chandgaon', 'Bahaddarhat', 'Oxygen', 'Bayezid',
  'Sholoshahar', '2 No Gate',
  'Bandar', 'EPZ', 'Patenga', 'Karnaphuli',
  'Online',
];

// A monthly tuition salary in BDT. The ceiling is deliberately generous —
// a Dhaka/Chittagong A-Level or admission-coaching post can reach five
// figures — but it stops a typo like 6000000 from topping every salary sort.
export const SALARY_MIN = 500;
export const SALARY_MAX = 100_000;

// True when every entry of `list` is in `allowed`.
export function allIn(list, allowed) {
  return Array.isArray(list) && list.every((v) => allowed.includes(v));
}
