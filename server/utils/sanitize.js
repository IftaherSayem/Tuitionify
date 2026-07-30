// Helpers for safely building Mongo queries from untrusted query-string input.

// Express parses `?field[$ne]=x` into an object, which would land in a Mongo
// filter as an operator instead of a value. Force anything user-supplied that
// is meant to be a scalar into a plain string.
export function asString(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return typeof value === 'string' ? value : '';
}

// Same idea for numbers: reject NaN/Infinity so we never build {$gte: NaN},
// which silently matches nothing. Returns null for absent or non-numeric
// input — note Number('') is 0, so the empty case must be checked first or
// an omitted filter would become a real `0` bound.
export function asNumber(value) {
  const s = asString(value).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Escapes regex metacharacters so a search term is matched literally.
// Without this, `(` throws "Regular expression is invalid" (a 500) and
// nested quantifiers let a caller burn database CPU (ReDoS).
export function escapeRegex(value) {
  return asString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Builds a case-insensitive "contains" matcher from a user search term,
// capped in length to bound the work the database will do.
export function safeSearchRegex(value, maxLen = 80) {
  const term = escapeRegex(value).slice(0, maxLen);
  if (!term) return null;
  return { $regex: term, $options: 'i' };
}

// Only allow values from a known set (enum-style filters).
export function asEnum(value, allowed) {
  const s = asString(value);
  return allowed.includes(s) ? s : '';
}
