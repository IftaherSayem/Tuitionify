import { describe, it, expect } from 'vitest';
import { normalizeBdPhone, isValidBdPhone, isValidOrEmptyBdPhone } from '../utils/phone.js';

describe('normalizeBdPhone', () => {
  it('keeps an already-canonical number unchanged', () => {
    expect(normalizeBdPhone('01712345678')).toBe('01712345678');
  });

  it('strips the +88 and 88 country prefixes', () => {
    expect(normalizeBdPhone('+8801712345678')).toBe('01712345678');
    expect(normalizeBdPhone('8801712345678')).toBe('01712345678');
  });

  it('strips spaces, dashes and parentheses', () => {
    expect(normalizeBdPhone('017 1234 5678')).toBe('01712345678');
    expect(normalizeBdPhone('017-1234-5678')).toBe('01712345678');
    expect(normalizeBdPhone(' +88 017-1234 5678 ')).toBe('01712345678');
  });

  it('returns empty string for empty or non-string input', () => {
    expect(normalizeBdPhone('')).toBe('');
    expect(normalizeBdPhone('   ')).toBe('');
    expect(normalizeBdPhone(undefined)).toBe('');
    expect(normalizeBdPhone(null)).toBe('');
    expect(normalizeBdPhone(12345)).toBe('');
  });

  it('does not strip a leading 88 that is part of a local number', () => {
    // 01988... is a real GP number; the 88 here is not a country code.
    expect(normalizeBdPhone('01988123456')).toBe('01988123456');
  });
});

describe('isValidBdPhone', () => {
  it('accepts every operator prefix in use (013-019)', () => {
    for (const d of [3, 4, 5, 6, 7, 8, 9]) {
      expect(isValidBdPhone(`01${d}12345678`)).toBe(true);
    }
  });

  it('rejects retired or invalid operator digits', () => {
    expect(isValidBdPhone('01012345678')).toBe(false);
    expect(isValidBdPhone('01112345678')).toBe(false);
    expect(isValidBdPhone('01212345678')).toBe(false);
  });

  it('rejects wrong lengths', () => {
    expect(isValidBdPhone('0171234567')).toBe(false);   // 10 digits
    expect(isValidBdPhone('017123456789')).toBe(false); // 12 digits
  });

  it('rejects numbers not starting with 01', () => {
    expect(isValidBdPhone('11712345678')).toBe(false);
    expect(isValidBdPhone('91712345678')).toBe(false);
  });

  it('rejects the placeholder style the seed file used to carry', () => {
    expect(isValidBdPhone('017xxxxxxxx')).toBe(false);
  });

  it('rejects an un-normalised number — callers must normalise first', () => {
    expect(isValidBdPhone('+8801712345678')).toBe(false);
    expect(isValidBdPhone('017 1234 5678')).toBe(false);
  });
});

describe('isValidOrEmptyBdPhone', () => {
  it('allows empty, because the field itself is optional', () => {
    expect(isValidOrEmptyBdPhone('')).toBe(true);
  });

  it('still rejects a present but malformed number', () => {
    expect(isValidOrEmptyBdPhone('123')).toBe(false);
  });

  it('accepts a valid number', () => {
    expect(isValidOrEmptyBdPhone('01812345678')).toBe(true);
  });
});
