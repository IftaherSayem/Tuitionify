import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  applyActionCode, verifyPasswordResetCode, confirmPasswordReset,
} from 'firebase/auth';
import { CheckCircle2, XCircle, Lock, LogIn, Home } from 'lucide-react';
import { auth } from '../firebase/config';
import Logo from '../components/Logo';

export default function AuthAction() {
  const [params] = useSearchParams();
  const mode = params.get('mode');
  const oobCode = params.get('oobCode');

  if (mode === 'resetPassword') return <ResetPassword oobCode={oobCode} />;
  if (mode === 'verifyEmail') return <VerifyEmail oobCode={oobCode} />;
  if (mode === 'recoverEmail') return <RecoverEmail oobCode={oobCode} />;
  return (
    <Shell>
      <Fail title="Invalid link" message="This link is missing or malformed. Request a new one." />
    </Shell>
  );
}

function VerifyEmail({ oobCode }) {
  const [status, setStatus] = useState('working');
  useEffect(() => {
    if (!oobCode) return setStatus('error');
    applyActionCode(auth, oobCode).then(() => setStatus('ok')).catch(() => setStatus('error'));
  }, [oobCode]);

  return (
    <Shell>
      {status === 'working' && <Working message="Verifying your email…" />}
      {status === 'ok' && (
        <Success title="Email verified" message="Your email is confirmed. You're all set to sign in and start using Tuitionify."
          cta={<Link to="/login" className="btn-primary w-full"><LogIn size={17} /> Continue to login</Link>} />
      )}
      {status === 'error' && <Fail title="Verification failed" message="This link is invalid or has expired. Log in and request a new verification email." />}
    </Shell>
  );
}

function ResetPassword({ oobCode }) {
  const [status, setStatus] = useState('checking');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!oobCode) return setStatus('error');
    verifyPasswordResetCode(auth, oobCode).then((mail) => { setEmail(mail); setStatus('ready'); }).catch(() => setStatus('error'));
  }, [oobCode]);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (pw.length < 6) return setErr('Password must be at least 6 characters.');
    setBusy(true);
    try {
      await confirmPasswordReset(auth, oobCode, pw);
      setStatus('done');
    } catch {
      setErr('Could not reset password. The link may have expired.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      {status === 'checking' && <Working message="Checking your reset link…" />}
      {status === 'error' && <Fail title="Link expired" message="This password reset link is invalid or has expired. Request a new one from the login page." />}
      {status === 'done' && (
        <Success title="Password updated" message="Your password has been changed. You can now log in with your new password."
          cta={<Link to="/login" className="btn-primary w-full"><LogIn size={17} /> Continue to login</Link>} />
      )}
      {status === 'ready' && (
        <>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Set a new password</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">for {email}</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">New password</label>
              <div className="relative">
                <Lock size={17} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
                <input type="password" required minLength={6} className="input pl-10" placeholder="At least 6 characters" value={pw} onChange={(e) => setPw(e.target.value)} />
              </div>
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? 'Saving…' : 'Update password'}</button>
          </form>
        </>
      )}
    </Shell>
  );
}

function RecoverEmail({ oobCode }) {
  const [status, setStatus] = useState('working');
  useEffect(() => {
    if (!oobCode) return setStatus('error');
    applyActionCode(auth, oobCode).then(() => setStatus('ok')).catch(() => setStatus('error'));
  }, [oobCode]);

  return (
    <Shell>
      {status === 'working' && <Working message="Restoring your email…" />}
      {status === 'ok' && (
        <Success title="Email restored" message="Your account email has been reverted. We recommend resetting your password to secure your account."
          cta={<Link to="/login" className="btn-primary w-full"><LogIn size={17} /> Go to login</Link>} />
      )}
      {status === 'error' && <Fail title="Link expired" message="This link is invalid or has expired." />}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <div className="mb-6 flex justify-center"><Logo size={40} /></div>
      <div className="card p-8 text-center">{children}</div>
    </div>
  );
}

function Working({ message }) {
  return (
    <div className="flex flex-col items-center py-4">
      <span className="h-9 w-9 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 dark:border-brand-800 dark:border-t-brand-400" />
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

function Success({ title, message, cta }) {
  return (
    <>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
        <CheckCircle2 size={30} className="text-brand-600" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
      <div className="mt-6">{cta}</div>
      <Link to="/" className="mt-3 inline-flex items-center justify-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
        <Home size={15} /> Back to home
      </Link>
    </>
  );
}

function Fail({ title, message }) {
  return (
    <>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
        <XCircle size={30} className="text-red-500" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
      <Link to="/login" className="btn-primary mt-6 w-full"><LogIn size={17} /> Go to login</Link>
      <Link to="/" className="mt-3 inline-flex items-center justify-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
        <Home size={15} /> Back to home
      </Link>
    </>
  );
}
