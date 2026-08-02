import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Tuition from '../models/Tuition.js';
import Review from '../models/Review.js';

// Schema-level guards. These run without a DB connection: validateSync()
// exercises setters and validators on an unsaved document.

const oid = () => new mongoose.Types.ObjectId();
const failed = (doc) => {
  const e = doc.validateSync();
  return e ? Object.keys(e.errors) : [];
};

const tutor = (over = {}) =>
  new User({ firebaseUid: 'fb1', name: 'Tanvir', email: 'a@b.com', role: 'tutor', ...over });

const tuition = (over = {}) =>
  new Tuition({
    title: 'Math tutor needed',
    classLevel: 'Class 9-10',
    subjects: ['Math'],
    area: 'Kumira',
    salary: 6000,
    createdBy: oid(),
    ...over,
  });

describe('User.photo', () => {
  it('rejects a javascript: URL', () => {
    expect(failed(tutor({ photo: 'javascript:alert(1)' }))).toContain('photo');
  });

  it('rejects a data: URL', () => {
    expect(failed(tutor({ photo: 'data:text/html,<script>' }))).toContain('photo');
  });

  it('accepts an https URL and an empty value', () => {
    expect(failed(tutor({ photo: 'https://i.ibb.co/abc.jpg' }))).toEqual([]);
    expect(failed(tutor({ photo: '' }))).toEqual([]);
  });
});

describe('User.phone', () => {
  it('normalises +88 and punctuation through the setter', () => {
    expect(tutor({ phone: '+88 017-1234 5678' }).phone).toBe('01712345678');
  });

  it('rejects a malformed number', () => {
    expect(failed(tutor({ phone: '12345' }))).toContain('phone');
  });

  it('allows an empty phone — the gate is at apply time, not on the profile', () => {
    expect(failed(tutor({ phone: '' }))).toEqual([]);
  });
});

describe('User list fields', () => {
  it('rejects a subject that is not an offered option', () => {
    expect(failed(tutor({ subjects: ['Underwater Basket Weaving'] }))).toContain('subjects');
  });

  it('rejects an area outside the Chittagong list', () => {
    expect(failed(tutor({ preferredAreas: ['Gulshan'] }))).toContain('preferredAreas');
  });

  it('rejects a class level that is not in the BD system list', () => {
    expect(failed(tutor({ classLevels: ['Grade 12'] }))).toContain('classLevels');
  });

  it('accepts real BD curriculum values', () => {
    expect(failed(tutor({
      subjects: ['Math', 'Higher Math', 'ICT'],
      classLevels: ['SSC', 'HSC', 'Admission'],
      preferredAreas: ['Kumira', 'GEC', 'Online'],
    }))).toEqual([]);
  });
});

describe('User.expectedSalary', () => {
  it('rejects a negative salary', () => {
    expect(failed(tutor({ expectedSalary: -1 }))).toContain('expectedSalary');
  });

  it('rejects an absurd salary that would top every sort', () => {
    expect(failed(tutor({ expectedSalary: 6_000_000 }))).toContain('expectedSalary');
  });

  it('accepts a realistic BDT monthly rate', () => {
    expect(failed(tutor({ expectedSalary: 6000 }))).toEqual([]);
  });
});

describe('Tuition', () => {
  it('accepts a well-formed post', () => {
    expect(failed(tuition())).toEqual([]);
  });

  it('rejects an unknown class level, area and subject', () => {
    expect(failed(tuition({ classLevel: 'Grade 9' }))).toContain('classLevel');
    expect(failed(tuition({ area: 'Banani' }))).toContain('area');
    expect(failed(tuition({ subjects: ['Astrology'] }))).toContain('subjects');
  });

  it('requires at least one subject', () => {
    expect(failed(tuition({ subjects: [] }))).toContain('subjects');
  });

  it('bounds salary at both ends', () => {
    expect(failed(tuition({ salary: 100 }))).toContain('salary');
    expect(failed(tuition({ salary: 500_000 }))).toContain('salary');
  });

  it('bounds daysPerWeek to a real week', () => {
    expect(failed(tuition({ daysPerWeek: 0 }))).toContain('daysPerWeek');
    expect(failed(tuition({ daysPerWeek: 9 }))).toContain('daysPerWeek');
    expect(failed(tuition({ daysPerWeek: 6 }))).toEqual([]);
  });

  it('caps free text', () => {
    expect(failed(tuition({ title: 'x'.repeat(200) }))).toContain('title');
    expect(failed(tuition({ description: 'x'.repeat(4000) }))).toContain('description');
  });
});

describe('Review', () => {
  const review = (over = {}) =>
    new Review({ tutor: oid(), author: oid(), authorName: 'Kamal', rating: 5, ...over });

  it('holds the 1-5 star range', () => {
    expect(failed(review({ rating: 0 }))).toContain('rating');
    expect(failed(review({ rating: 6 }))).toContain('rating');
    expect(failed(review({ rating: 3 }))).toEqual([]);
  });

  it('caps comment and reply length', () => {
    expect(failed(review({ comment: 'x'.repeat(3000) }))).toContain('comment');
    expect(failed(review({ reply: 'x'.repeat(3000) }))).toContain('reply');
  });
});
