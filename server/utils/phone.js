// Bangladeshi mobile number handling.
//
// Every BD mobile number is 11 digits: `01` + an operator digit + 8 more.
// Operator digits in use: 3 Banglalink, 4 Banglalink, 5 Teletalk,
// 6 Airtel, 7 Grameenphone, 8 Robi, 9 Banglalink.
//
// People write the same number many ways — `01712345678`, `+8801712345678`,
// `8801712345678`, `017 1234 5678`, `017-1234-5678`. All of those are the
// same phone, so we normalise to the bare 11-digit form before storing.
// Without that, two records for one number look different and a guardian
// dialling from a copied string can end up with a broken number.

const BD_MOBILE = /^01[3-9]\d{8}$/;

// Reduces any of the accepted spellings to bare `01XXXXXXXXX`, or returns
// '' when the input is empty. A value that cannot be normalised is returned
// digit-stripped so the validator below can reject it with a clear message.
export function normalizeBdPhone(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  let digits = trimmed.replace(/\D/g, '');

  // Drop the +88 / 88 country prefix if the rest looks like a local number.
  if (digits.startsWith('88') && digits.length > 11) {
    digits = digits.slice(2);
  }

  return digits;
}

export function isValidBdPhone(value) {
  return BD_MOBILE.test(value);
}

// Model-level validator: an empty phone is allowed (the field is optional),
// but a present one must be a real BD mobile number. Applying to a tuition
// is gated on having one — see routes/applications.js.
export function isValidOrEmptyBdPhone(value) {
  return !value || BD_MOBILE.test(value);
}
