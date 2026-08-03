import { Link } from 'react-router-dom';
import { ShieldBan, LogOut, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Shown instead of any protected page when the signed-in account has been
// restricted by an admin. Without this the app read "logged in but no profile"
// as "registration unfinished" and sent banned users to the role picker.
export default function Restricted() {
  const { firebaseUser, logout } = useAuth();

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
        <ShieldBan size={30} />
      </span>

      <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
        Your account has been restricted
      </h1>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        An administrator has restricted
        {firebaseUser?.email ? <span className="font-medium text-slate-700 dark:text-slate-300"> {firebaseUser.email}</span> : ' this account'}.
        You can still browse tuitions and tutors, but you cannot post, apply,
        review, or message while the restriction is in place.
      </p>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        If you think this is a mistake, contact an admin with your student ID to
        have it reviewed.
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/tuitions" className="btn-outline">
          <Home size={16} /> Browse tuitions
        </Link>
        <button onClick={logout} className="btn-primary">
          <LogOut size={16} /> Log out
        </button>
      </div>
    </div>
  );
}
