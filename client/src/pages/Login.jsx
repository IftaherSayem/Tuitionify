import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { loginEmail, loginGoogle, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  async function routeAfterLogin() {
    const profile = await refreshProfile();
    navigate(profile ? from : '/complete-profile', { replace: true });
  }

  async function handleEmail(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await loginEmail(form.email, form.password);
      toast.success('Welcome back!');
      await routeAfterLogin();
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      await loginGoogle();
      toast.success('Welcome back!');
      await routeAfterLogin();
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-slate-900">Log in</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back to Tuitionify.</p>

        <form onSubmit={handleEmail} className="mt-6 space-y-4">
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
                type="password" required className="input pl-10" placeholder="••••••••"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            <LogIn size={17} /> {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" /> OR <span className="h-px flex-1 bg-slate-200" />
        </div>

        <button onClick={handleGoogle} disabled={busy} className="btn-outline w-full">
          <GoogleIcon /> Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

function friendly(err) {
  const code = err?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password')) return 'Incorrect email or password';
  if (code.includes('user-not-found')) return 'No account with that email';
  if (code.includes('too-many-requests')) return 'Too many attempts. Try again later';
  if (code.includes('popup-closed')) return 'Google sign-in cancelled';
  return err?.message || 'Something went wrong';
}
