import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, GraduationCap, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// Step 1: pick a role. Step 2: fill credentials → create Firebase user → create profile.
export default function Register() {
  const { signupEmail, loginGoogle, registerProfile } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);

  async function handleEmailSignup(e) {
    e.preventDefault();
    if (!role) return toast.error('Please choose a role');
    setBusy(true);
    try {
      await signupEmail(form.name, form.email, form.password);
      await registerProfile({ name: form.name, role });
      toast.success('Account created!');
      navigate(role === 'tutor' ? '/dashboard?edit=1' : '/dashboard', { replace: true });
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (!role) return toast.error('Please choose a role first');
    setBusy(true);
    try {
      const cred = await loginGoogle();
      await registerProfile({ name: cred.user.displayName, role });
      toast.success('Account created!');
      navigate(role === 'tutor' ? '/dashboard?edit=1' : '/dashboard', { replace: true });
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">Join Tuitionify in a minute.</p>

        {/* Role picker */}
        <div className="mt-6">
          <label className="label">I am a…</label>
          <div className="grid grid-cols-2 gap-3">
            <RoleCard
              active={role === 'seeker'} onClick={() => setRole('seeker')}
              icon={Users} title="Guardian / Student" desc="I want to find a tutor"
            />
            <RoleCard
              active={role === 'tutor'} onClick={() => setRole('tutor')}
              icon={GraduationCap} title="Tutor" desc="I want to give tuition"
            />
          </div>
        </div>

        <form onSubmit={handleEmailSignup} className="mt-6 space-y-4">
          <div>
            <label className="label">Full name</label>
            <div className="relative">
              <User size={17} className="absolute left-3 top-3 text-slate-400" />
              <input
                required className="input pl-10" placeholder="Your name"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={17} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="email" required className="input pl-10" placeholder="you@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={17} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="password" required minLength={6} className="input pl-10" placeholder="At least 6 characters"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" /> OR <span className="h-px flex-1 bg-slate-200" />
        </div>

        <button onClick={handleGoogle} disabled={busy} className="btn-outline w-full">
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}

function RoleCard({ active, onClick, icon: Icon, title, desc }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition ${
        active ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <Icon size={22} className={active ? 'text-brand-600' : 'text-slate-500'} />
      <span className="text-sm font-semibold text-slate-900">{title}</span>
      <span className="text-xs text-slate-500">{desc}</span>
    </button>
  );
}

function friendly(err) {
  const code = err?.code || '';
  if (code.includes('email-already-in-use')) return 'That email is already registered. Try logging in.';
  if (code.includes('weak-password')) return 'Password should be at least 6 characters';
  if (code.includes('invalid-email')) return 'Please enter a valid email';
  if (code.includes('popup-closed')) return 'Google sign-in cancelled';
  return err?.response?.data?.message || err?.message || 'Something went wrong';
}
