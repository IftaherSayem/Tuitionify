import { describe, it, expect } from 'vitest';
import { asString, asNumber, asEnum, escapeRegex, safeSearchRegex } from '../utils/sanitize.js';

// These helpers are what keep `?field[$ne]=x` from reaching Mongo as an
// operator. Express parses bracket syntax into objects, so a filter built
// from raw query input is an injection.

describe('asString', () => {
  it('passes a plain string through', () => {
    expect(asString('Kumira')).toBe('Kumira');
  });

  it('flattens the injection shape ?area[$ne]=x to empty', () => {
    expect(asString({ $ne: 'x' })).toBe('');
  });

  it('takes the first element of an array, or empty if not a string', () => {
    expect(asString(['a', 'b'])).toBe('a');
    expect(asString([{ $ne: 1 }])).toBe('');
  });

  it('returns empty for null/undefined/number', () => {
    expect(asString(null)).toBe('');
    expect(asString(undefined)).toBe('');
    expect(asString(42)).toBe('');
  });
});

describe('asNumber', () => {
  it('parses a numeric string', () => {
    expect(asNumber('6000')).toBe(6000);
  });

  it('returns null for empty, so an omitted filter never becomes a real 0 bound', () => {
    expect(asNumber('')).toBeNull();
    expect(asNumber(undefined)).toBeNull();
  });

  it('rejects non-numeric and non-finite input', () => {
    expect(asNumber('abc')).toBeNull();
    expect(asNumber('Infinity')).toBeNull();
    expect(asNumber({ $gt: 0 })).toBeNull();
  });
});

describe('asEnum', () => {
  it('allows a listed value and rejects anything else', () => {
    expect(asEnum('home', ['home', 'online'])).toBe('home');
    expect(asEnum('smuggled', ['home', 'online'])).toBe('');
    expect(asEnum({ $ne: null }, ['home', 'online'])).toBe('');
  });
});

describe('escapeRegex / safeSearchRegex', () => {
  it('escapes metacharacters so a search term matches literally', () => {
    expect(escapeRegex('a(b)c')).toBe('a\\(b\\)c');
  });

  it('neutralises a ReDoS-shaped term', () => {
    const { $regex } = safeSearchRegex('(a+)+$');
    expect(() => new RegExp($regex)).not.toThrow();
    expect(new RegExp($regex).test('(a+)+$')).toBe(true);
  });

  it('caps term length to bound database work', () => {
    expect(safeSearchRegex('x'.repeat(500)).$regex.length).toBeLessThanOrEqual(80);
  });

  it('returns null for an empty term', () => {
    expect(safeSearchRegex('')).toBeNull();
    expect(safeSearchRegex(undefined)).toBeNull();
  });
});
