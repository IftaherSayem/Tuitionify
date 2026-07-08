import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

// Guards routes that need a logged-in, registered user.
// Optionally restrict by role ('tutor' | 'seeker') or admin-only.
export default function ProtectedRoute({ children, role, admin }) {
  const { firebaseUser, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner full />;

  // Logged in with Firebase but no Mongo profile yet → finish registration.
  if (firebaseUser && !profile) {
    return <Navigate to="/complete-profile" state={{ from: location }} replace />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (admin && !profile?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (role && profile?.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
