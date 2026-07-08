import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Spinner from './components/Spinner';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const Tuitions = lazy(() => import('./pages/Tuitions'));
const TuitionDetails = lazy(() => import('./pages/TuitionDetails'));
const Tutors = lazy(() => import('./pages/Tutors'));
const TutorProfile = lazy(() => import('./pages/TutorProfile'));
const PostTuition = lazy(() => import('./pages/PostTuition'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Admin = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<Spinner full />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />

          <Route path="/tuitions" element={<Tuitions />} />
          <Route path="/tuitions/:id" element={<TuitionDetails />} />
          <Route path="/tutors" element={<Tutors />} />
          <Route path="/tutors/:id" element={<TutorProfile />} />

          <Route
            path="/post-tuition"
            element={
              <ProtectedRoute role="seeker">
                <PostTuition />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute admin>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
