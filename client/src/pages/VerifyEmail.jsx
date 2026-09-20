import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, RefreshCw, LogOut, CheckCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase/config';
import Logo from '../components/Logo';

export default function VerifyEmail() {
  const { firebaseUser, resendVerification, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const email = firebaseUser?.email || location.state?.email || 'your email';

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // If user becomes verified in session, automatically forward them
  useEffect(() => {
    if (firebaseUser?.emailVerified) {
      navigate('/dashboard', { replace: true });
    }
  }, [firebaseUser, navigate]);

  async function handleResend() {
    if (cooldown > 0) return;
    setResending(true);
    try {
      await resendVerification();
      toast.success('Verification email sent! Check your inbox.');
      setCooldown(60);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to send verification email. Please try again.';
      toast.error(msg);
    } finally {
      setResending(false);
    }
  }

  async function handleCheckAgain() {
    setChecking(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          await refreshProfile();
          toast.success('Email confirmed! Welcome to Tuitionify.');
          navigate('/dashboard', { replace: true });
          return;
        }
      }
      toast('Email not verified yet. Please check the link in your inbox or spam.', {
        icon: 'ℹ️',
      });
    } catch (err) {
      toast.error('Could not check status. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error('Could not sign out');
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <div className="mb-6 flex justify-center">
        <Logo size={40} />
      </div>

      <div className="card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
          <Mail size={30} />
        </div>

        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
          Verify your email
        </h1>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          We sent a verification link to:
        </p>
        <p className="mt-1 font-semibold text-slate-900 dark:text-white">
          {email}
        </p>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Next steps:
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>Open the email from <strong>Tuitionify</strong> and click the verification button.</li>
            <li>If you don’t see it within a minute, check your <strong>Spam or Junk</strong> folder.</li>
            <li>Once confirmed, click &ldquo;Already verified? Check again&rdquo; below.</li>
          </ul>
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleCheckAgain}
            disabled={checking}
            className="btn-primary w-full"
          >
            {checking ? (
              <RefreshCw size={17} className="animate-spin" />
            ) : (
              <CheckCircle size={17} />
            )}
            {checking ? 'Checking verification…' : 'Already verified? Check again'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="btn-outline w-full"
          >
            <RefreshCw size={16} className={resending ? 'animate-spin' : ''} />
            {cooldown > 0
              ? `Resend available in ${cooldown}s`
              : resending
              ? 'Sending…'
              : 'Resend verification email'}
          </button>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            <LogOut size={14} /> Back to login / Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
