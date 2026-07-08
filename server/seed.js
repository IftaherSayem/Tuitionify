import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Tuition from './models/Tuition.js';
import Review from './models/Review.js';

// Sample data uses fake firebaseUids (prefixed 'seed_') so it never
// collides with real Firebase accounts. These demo users can't log in;
// they exist to make the listings look alive for your presentation.

const tutors = [
  {
    firebaseUid: 'seed_tutor_1', name: 'Tanvir Ahmed', email: 'tanvir@example.com', role: 'tutor',
    gender: 'male', phone: '017xxxxxxxx', university: 'International Islamic University Chittagong',
    department: 'Computer Science & Engineering', subjects: ['Math', 'Physics', 'ICT'],
    classLevels: ['Class 9-10', 'HSC'], preferredAreas: ['Kumira', 'GEC'],
    expectedSalary: 6000, mode: 'both', ratingAvg: 4.8, ratingCount: 2, isVerified: true, emailVerified: true,
    bio: '3rd year CSE student. Specialise in Math and Physics for SSC & HSC. Patient, exam-focused teaching.',
    photo: 'https://i.pravatar.cc/150?img=12',
  },
  {
    firebaseUid: 'seed_tutor_2', name: 'Sadia Rahman', email: 'sadia@example.com', role: 'tutor',
    gender: 'female', phone: '018xxxxxxxx', university: 'International Islamic University Chittagong',
    department: 'English', subjects: ['English', 'Bangla'], classLevels: ['Class 6-8', 'Class 9-10'],
    preferredAreas: ['Agrabad', 'Halishahar'], expectedSalary: 5000, mode: 'home', ratingAvg: 4.9, ratingCount: 3, isVerified: true, emailVerified: true,
    bio: 'English literature major. I make grammar and writing simple and fun for school students.',
    photo: 'https://i.pravatar.cc/150?img=45',
  },
  {
    firebaseUid: 'seed_tutor_3', name: 'Rakib Hasan', email: 'rakib@example.com', role: 'tutor',
    gender: 'male', phone: '019xxxxxxxx', university: 'International Islamic University Chittagong',
    department: 'Electrical & Electronic Engineering', subjects: ['Math', 'Higher Math', 'Physics'],
    classLevels: ['HSC', 'Admission'], preferredAreas: ['Nasirabad', 'Muradpur'],
    expectedSalary: 8000, mode: 'both', ratingAvg: 4.6, ratingCount: 1,
    bio: 'EEE student with a passion for problem solving. Admission (varsity + engineering) coaching for Math & Physics.',
    photo: 'https://i.pravatar.cc/150?img=33',
  },
  {
    firebaseUid: 'seed_tutor_4', name: 'Nusrat Jahan', email: 'nusrat@example.com', role: 'tutor',
    gender: 'female', phone: '016xxxxxxxx', university: 'International Islamic University Chittagong',
    department: 'Chemistry', subjects: ['Chemistry', 'Biology', 'Science'],
    classLevels: ['Class 9-10', 'HSC'], preferredAreas: ['Khulshi', 'Panchlaish'],
    expectedSalary: 6500, mode: 'home', ratingAvg: 4.7, ratingCount: 2,
    bio: 'Chemistry major. SSC/HSC science made easy with lots of practice and clear concepts.',
    photo: 'https://i.pravatar.cc/150?img=47',
  },
];

const seekers = [
  {
    firebaseUid: 'seed_seeker_1', name: 'Kamal Uddin (Guardian)', email: 'kamal@example.com',
    role: 'seeker', gender: 'male', phone: '015xxxxxxxx', photo: 'https://i.pravatar.cc/150?img=60',
  },
  {
    firebaseUid: 'seed_seeker_2', name: 'Fatema Begum (Guardian)', email: 'fatema@example.com',
    role: 'seeker', gender: 'female', phone: '013xxxxxxxx', photo: 'https://i.pravatar.cc/150?img=32',
  },
];

async function run() {
  await connectDB();
  console.log('Clearing existing seed data…');
  await User.deleteMany({ firebaseUid: /^seed_/ });
  // Remove tuitions/reviews created by seed users (handled after re-insert).

  const createdTutors = await User.insertMany(tutors);
  const createdSeekers = await User.insertMany(seekers);
  console.log(`Inserted ${createdTutors.length} tutors, ${createdSeekers.length} seekers.`);

  // Clean any old tuitions/reviews tied to seed users by matching new ids is
  // unnecessary since we cleared users; also clear demo tuitions/reviews.
  await Tuition.deleteMany({ title: /\[demo\]/ });

  const tuitions = [
    {
      title: '[demo] Math & Physics tutor needed for Class 10',
      classLevel: 'Class 9-10', subjects: ['Math', 'Physics'], area: 'Kumira',
      salary: 6000, daysPerWeek: 4, mode: 'home', genderPreference: 'any',
      description: 'Looking for a serious tutor for my son, Class 10 (science). 4 days/week, evening.',
      createdBy: createdSeekers[0]._id,
    },
    {
      title: '[demo] English tutor for Class 7 student',
      classLevel: 'Class 6-8', subjects: ['English'], area: 'Agrabad',
      salary: 4500, daysPerWeek: 3, mode: 'home', genderPreference: 'female',
      description: 'Need a female English tutor for my daughter. Focus on grammar and speaking.',
      createdBy: createdSeekers[1]._id,
    },
    {
      title: '[demo] HSC Chemistry & Biology home tutor',
      classLevel: 'HSC', subjects: ['Chemistry', 'Biology'], area: 'Khulshi',
      salary: 7000, daysPerWeek: 3, mode: 'home', genderPreference: 'any',
      description: 'HSC 1st year science student needs help with Chemistry and Biology.',
      createdBy: createdSeekers[0]._id,
    },
    {
      title: '[demo] Online Higher Math help for admission',
      classLevel: 'Admission', subjects: ['Higher Math', 'Math'], area: 'Online',
      salary: 8000, daysPerWeek: 5, mode: 'online', genderPreference: 'any',
      description: 'Preparing for engineering admission. Need strong Higher Math support online.',
      createdBy: createdSeekers[1]._id,
    },
  ];
  const createdTuitions = await Tuition.insertMany(tuitions);
  console.log(`Inserted ${createdTuitions.length} demo tuitions.`);

  // A couple of demo reviews.
  await Review.deleteMany({ comment: /\[demo\]/ });
  await Review.insertMany([
    {
      tutor: createdTutors[0]._id, author: createdSeekers[0]._id, authorName: createdSeekers[0].name,
      rating: 5, comment: '[demo] Excellent tutor, my son improved a lot in Physics.',
    },
    {
      tutor: createdTutors[1]._id, author: createdSeekers[1]._id, authorName: createdSeekers[1].name,
      rating: 5, comment: '[demo] Very caring and punctual. Highly recommended.',
    },
  ]);
  console.log('Inserted demo reviews.');

  console.log('✓ Seed complete.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
