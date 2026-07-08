import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { GraduationCap, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

// Shown when a Firebase user exists but has no Mongo profile yet
// (e.g. logged in with Google before choosing a role).
export default function CompleteProfile() {
  const { firebaseUser, profile, loading, registerProfile } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner full />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (profile) return <Navigate to="/dashboard" replace />;

  async function handleSubmit() {
    if (!role) return toast.error('Please choose a role');
    setBusy(true);
    try {
      await registerProfile({ name: firebaseUser.displayName || 'User', role });
      toast.success('Profile ready!');
      navigate(role === 'tutor' ? '/dashboard?edit=1' : '/dashboard', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save profile');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-slate-900">One last step</h1>
        <p className="mt-1 text-sm text-slate-500">Tell us how you'll use Tuitionify.</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button" onClick={() => setRole('seeker')}
            className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition ${
              role === 'seeker' ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200' : 'border-slate-200'
            }`}
          >
            <Users size={22} className={role === 'seeker' ? 'text-brand-600' : 'text-slate-500'} />
            <span className="text-sm font-semibold">Guardian / Student</span>
            <span className="text-xs text-slate-500">Find a tutor</span>
          </button>
          <button
            type="button" onClick={() => setRole('tutor')}
            className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition ${
              role === 'tutor' ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200' : 'border-slate-200'
            }`}
          >
            <GraduationCap size={22} className={role === 'tutor' ? 'text-brand-600' : 'text-slate-500'} />
            <span className="text-sm font-semibold">Tutor</span>
            <span className="text-xs text-slate-500">Give tuition</span>
          </button>
        </div>

        <button onClick={handleSubmit} disabled={busy} className="btn-primary mt-6 w-full">
          {busy ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
