import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus, FileText, Send, Pencil, ExternalLink, ToggleLeft, ToggleRight, Mail, MailWarning, Bookmark, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { StarDisplay } from '../components/StarRating';
import VerifiedBadge from '../components/VerifiedBadge';
import TutorProfileForm from '../components/TutorProfileForm';
import TuitionCard from '../components/TuitionCard';
import ConfirmModal from '../components/ConfirmModal';
import { CURRENCY } from '../data/options';

export default function Dashboard() {
  const { profile, isTutor } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState(searchParams.get('edit') === '1');

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <VerifyEmailBanner />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Hi, {profile?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {isTutor ? 'Your tutor dashboard' : 'Your guardian dashboard'}
          </p>
        </div>
        {isTutor && !editing && (
          <button onClick={() => setEditing(true)} className="btn-outline">
            <Pencil size={16} /> Edit Profile
          </button>
        )}
        {!isTutor && (
          <Link to="/post-tuition" className="btn-primary">
            <Plus size={16} /> Post a Tuition
          </Link>
        )}
      </div>

      <div className="mt-8">
        {isTutor ? (
          editing ? (
            <TutorProfileForm onDone={() => { setEditing(false); setSearchParams({}); }} />
          ) : (
            <TutorDashboard />
          )
        ) : (
          <SeekerDashboard />
        )}
      </div>

      <SavedTuitions />
    </div>
  );
}

function VerifyEmailBanner() {
  const { firebaseUser, resendVerification } = useAuth();
  const [sending, setSending] = useState(false);

  if (!firebaseUser || firebaseUser.emailVerified) return null;

  async function handleResend() {
    setSending(true);
    try {
      await resendVerification();
      toast.success('Verification email sent. Check your inbox, then reload.');
    } catch (err) {
      toast.error(err?.code?.includes('too-many-requests')
        ? 'Too many requests. Try again in a few minutes.'
        : 'Could not send email. Try again later.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/30">
      <MailWarning size={20} className="text-amber-600" />
      <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
        Please verify your email ({firebaseUser.email}). Check your inbox for the link.
      </p>
      <button onClick={handleResend} disabled={sending} className="btn-outline px-3 py-1.5 text-xs">
        {sending ? 'Sending…' : 'Resend email'}
      </button>
    </div>
  );
}

function TutorDashboard() {
  const { profile } = useAuth();
  const [apps, setApps] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/applications/mine').then(({ data }) => setApps(data)).catch(() => setApps([])),
      api.get('/contact-requests/incoming').then(({ data }) => setRequests(data)).catch(() => setRequests([])),
    ]).finally(() => setLoading(false));
  }, []);

  async function decideRequest(reqId, status) {
    try {
      await api.patch(`/contact-requests/${reqId}`, { status });
      setRequests((rs) => rs.map((r) => (r._id === reqId ? { ...r, status } : r)));
      toast.success(status === 'approved' ? 'Contact shared with the seeker' : 'Request declined');
    } catch {
      toast.error('Action failed');
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <img
            src={profile.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=0f8f62&color=fff`}
            alt="" className="h-16 w-16 rounded-full ring-2 ring-brand-100 dark:ring-brand-800"
          />
          <div className="flex-1">
            <h2 className="flex items-center gap-1.5 text-lg font-bold text-slate-900 dark:text-white">
              {profile.name}
              {profile.isVerified && <VerifiedBadge size={18} withText />}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{profile.department || 'Add your department'}</p>
            <div className="mt-1"><StarDisplay value={profile.ratingAvg} count={profile.ratingCount} size={14} /></div>
          </div>
          <Link to={`/tutors/${profile._id}`} className="btn-outline text-sm">
            <ExternalLink size={15} /> View public profile
          </Link>
        </div>
        {(!profile.subjects?.length || !profile.preferredAreas?.length) && (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            Complete your profile (subjects, areas, salary) so guardians can find you.
          </p>
        )}
        {!profile.isVerified && (
          <p className="mt-3 rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600 dark:bg-slate-700 dark:text-slate-400">
            Your profile isn't verified yet. Verified tutors get a badge and rank higher — contact an admin with your student ID.
          </p>
        )}
      </div>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Mail size={18} /> Contact Requests
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {pendingCount} new
            </span>
          )}
        </h3>
        {loading ? (
          <Spinner />
        ) : requests.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No contact requests yet. When a guardian wants your number, it'll appear here for your approval.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r._id} className="card flex flex-wrap items-center gap-3 p-4">
                <img
                  src={r.seeker?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.seeker?.name || 'S')}&background=0f8f62&color=fff`}
                  alt="" className="h-11 w-11 rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 dark:text-white">{r.seeker?.name || 'A guardian'}</p>
                  {r.message && <p className="text-sm text-slate-600 dark:text-slate-400">"{r.message}"</p>}
                </div>
                {r.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button onClick={() => decideRequest(r._id, 'approved')} className="btn-primary px-3 py-1.5 text-xs">
                      Approve
                    </button>
                    <button onClick={() => decideRequest(r._id, 'declined')} className="btn-outline px-3 py-1.5 text-xs">
                      Decline
                    </button>
                  </div>
                ) : (
                  <span className={`badge ${r.status === 'declined' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : ''}`}>
                    {r.status === 'approved' ? 'Shared' : 'Declined'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Send size={18} /> My Applications
        </h3>
        {loading ? (
          <Spinner />
        ) : apps.length === 0 ? (
          <EmptyState
            title="No applications yet" icon={Send}
            message="Browse open tuitions and apply to start tutoring."
            action={<Link to="/tuitions" className="btn-primary mt-2">Find Tuitions</Link>}
          />
        ) : (
          <div className="space-y-3">
            {apps.map((a) => (
              <div key={a._id} className="card flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  {a.tuition ? (
                    <Link to={`/tuitions/${a.tuition._id}`} className="font-semibold text-slate-900 hover:text-brand-700 dark:text-white dark:hover:text-brand-400">
                      {a.tuition.title}
                    </Link>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">Tuition removed</span>
                  )}
                  {a.tuition && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {a.tuition.area} · {CURRENCY}{a.tuition.salary?.toLocaleString()}/mo
                    </p>
                  )}
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SeekerDashboard() {
  const [tuitions, setTuitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/tuitions/mine/posted');
      setTuitions(data);
    } catch {
      setTuitions([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function toggleStatus(t) {
    const next = t.status === 'open' ? 'closed' : 'open';
    try {
      await api.patch(`/tuitions/${t._id}/status`, { status: next });
      setTuitions((list) => list.map((x) => (x._id === t._id ? { ...x, status: next } : x)));
      toast.success(next === 'open' ? 'Tuition reopened' : 'Tuition closed');
    } catch {
      toast.error('Could not update');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/tuitions/${deleteTarget._id}`);
      setTuitions((list) => list.filter((x) => x._id !== deleteTarget._id));
      toast.success('Tuition deleted');
    } catch {
      toast.error('Could not delete');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (loading) return <Spinner />;

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
        <FileText size={18} /> My Posted Tuitions
      </h3>
      {tuitions.length === 0 ? (
        <EmptyState
          title="No tuitions posted yet" icon={FileText}
          message="Post your first tuition and start receiving applications from tutors."
          action={<Link to="/post-tuition" className="btn-primary mt-2"><Plus size={16} /> Post a Tuition</Link>}
        />
      ) : (
        <div className="space-y-3">
          {tuitions.map((t) => (
            <div key={t._id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link to={`/tuitions/${t._id}`} className="font-semibold text-slate-900 hover:text-brand-700 dark:text-white dark:hover:text-brand-400">
                  {t.title}
                </Link>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.classLevel} · {t.area} · {CURRENCY}{t.salary?.toLocaleString()}/mo
                </p>
              </div>
              <span className={`badge ${t.status === 'closed' ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : ''}`}>
                {t.status === 'closed' ? 'Closed' : 'Open'}
              </span>
              <button onClick={() => toggleStatus(t)} className="btn-ghost text-xs">
                {t.status === 'open' ? <ToggleRight size={16} className="text-brand-600" /> : <ToggleLeft size={16} />}
                {t.status === 'open' ? 'Close' : 'Reopen'}
              </button>
              <Link to={`/edit-tuition/${t._id}`} className="btn-ghost text-xs">
                <Pencil size={14} /> Edit
              </Link>
              <button onClick={() => setDeleteTarget(t)} className="btn-ghost text-xs text-red-500 hover:text-red-700 dark:text-red-400">
                <Trash2 size={14} /> Delete
              </button>
              <Link to={`/tuitions/${t._id}`} className="btn-outline text-xs">View applicants</Link>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Tuition"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will also remove all applications and bookmarks for this tuition. This action cannot be undone.`}
        busy={deleting}
      />
    </section>
  );
}

function SavedTuitions() {
  const { firebaseUser } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) { setLoading(false); return; }
    api.get('/bookmarks')
      .then(({ data }) => setBookmarks(data))
      .catch(() => setBookmarks([]))
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  async function handleRemove(tuitionId) {
    try {
      await api.post(`/bookmarks/${tuitionId}`);
      setBookmarks((b) => b.filter((bm) => bm.tuition?._id !== tuitionId));
      toast.success('Bookmark removed');
    } catch {
      toast.error('Could not remove bookmark');
    }
  }

  if (!firebaseUser) return null;

  return (
    <section className="mt-8">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
        <Bookmark size={18} /> Saved Tuitions
      </h3>
      {loading ? (
        <Spinner />
      ) : bookmarks.length === 0 ? (
        <EmptyState
          title="No saved tuitions" icon={Bookmark}
          message="Bookmark tuitions you're interested in and they'll appear here."
          action={<Link to="/tuitions" className="btn-primary mt-2">Browse Tuitions</Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {bookmarks.map((bm) =>
            bm.tuition ? (
              <TuitionCard
                key={bm._id}
                tuition={bm.tuition}
                isBookmarked
                onToggleBookmark={() => handleRemove(bm.tuition._id)}
              />
            ) : null
          )}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    accepted: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
    rejected: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };
  return <span className={`badge ${map[status] || ''}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}
