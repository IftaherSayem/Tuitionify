import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';
import Restricted from '../pages/Restricted';

// Guards routes that need a logged-in, registered user.
// Optionally restrict by role ('tutor' | 'seeker') or admin-only.
export default function ProtectedRoute({ children, role, admin }) {
  const { firebaseUser, profile, restricted, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner full />;

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Checked before the missing-profile branch below: a restricted account also
  // has no profile (GET /users/me 403s), and sending them to "finish
  // registration" explains nothing and leads to a dashboard that only errors.
  if (restricted) return <Restricted />;

  // Logged in with Firebase but no Mongo profile yet → finish registration.
  if (!profile) {
    return <Navigate to="/complete-profile" state={{ from: location }} replace />;
  }

  if (admin && !profile?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (role && profile?.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
