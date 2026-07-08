import { useEffect, useState } from 'react';
import { ShieldCheck, Users, Flag, BadgeCheck, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import VerifiedBadge from '../components/VerifiedBadge';

const TABS = [
  { key: 'tutors', label: 'Tutors', icon: Users },
  { key: 'reports', label: 'Reports', icon: Flag },
];

export default function Admin() {
  const [tab, setTab] = useState('tutors');

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
          <ShieldCheck size={22} />
        </span>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin panel</h1>
          <p className="mt-1 text-sm text-slate-500">Verify tutors and review reports.</p>
        </div>
      </div>

      <div className="mt-8 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'tutors' ? <TutorsTab /> : <ReportsTab />}
      </div>
    </div>
  );
}

function TutorsTab() {
  const [tutors, setTutors] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api
      .get('/admin/tutors')
      .then(({ data }) => setTutors(data))
      .catch(() => toast.error('Failed to load tutors'));
  }, []);

  async function toggleVerify(t) {
    setBusy(t._id);
    try {
      const { data } = await api.patch(`/admin/tutors/${t._id}/verify`, {
        isVerified: !t.isVerified,
      });
      setTutors((list) =>
        list.map((x) => (x._id === t._id ? { ...x, isVerified: data.isVerified } : x))
      );
      toast.success(data.isVerified ? 'Tutor verified' : 'Verification revoked');
    } catch {
      toast.error('Update failed');
    } finally {
      setBusy('');
    }
  }

  if (!tutors) return <Spinner />;
  if (!tutors.length)
    return <EmptyState title="No tutors yet" message="Tutors will appear here once they register." icon={Users} />;

  return (
    <div className="space-y-3">
      {tutors.map((t) => (
        <div key={t._id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{t.name}</span>
              {t.isVerified && <VerifiedBadge size={15} />}
            </div>
            <p className="text-sm text-slate-500">{t.email}</p>
            <p className="text-xs text-slate-400">
              {[t.department, t.university].filter(Boolean).join(' · ') || 'No academic info'}
            </p>
          </div>
          <button
            onClick={() => toggleVerify(t)}
            disabled={busy === t._id}
            className={t.isVerified ? 'btn-outline' : 'btn-primary'}
          >
            {t.isVerified ? (
              <><X size={16} /> Revoke</>
            ) : (
              <><BadgeCheck size={16} /> Verify</>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api
      .get('/admin/reports')
      .then(({ data }) => setReports(data))
      .catch(() => toast.error('Failed to load reports'));
  }, []);

  async function setStatus(r, status) {
    setBusy(r._id);
    try {
      const { data } = await api.patch(`/admin/reports/${r._id}`, { status });
      setReports((list) => list.map((x) => (x._id === r._id ? { ...x, status: data.status } : x)));
      toast.success(`Marked ${data.status}`);
    } catch {
      toast.error('Update failed');
    } finally {
      setBusy('');
    }
  }

  if (!reports) return <Spinner />;
  if (!reports.length)
    return <EmptyState title="No reports" message="Reported profiles and posts will show up here." icon={Flag} />;

  const statusStyle = {
    open: 'bg-amber-50 text-amber-700',
    reviewed: 'bg-brand-50 text-brand-700',
    dismissed: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r._id} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="chip capitalize">{r.targetType}</span>
                <span className="font-semibold text-slate-900">{r.reason}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyle[r.status]}`}>
                  {r.status}
                </span>
              </div>
              {r.details && <p className="mt-1.5 text-sm text-slate-600">{r.details}</p>}
              <p className="mt-1 text-xs text-slate-400">
                Reported by {r.reporter?.name || 'Unknown'} ({r.reporter?.email || '—'})
              </p>
            </div>
            {r.status === 'open' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setStatus(r, 'reviewed')}
                  disabled={busy === r._id}
                  className="btn-primary"
                >
                  <Check size={16} /> Reviewed
                </button>
                <button
                  onClick={() => setStatus(r, 'dismissed')}
                  disabled={busy === r._id}
                  className="btn-outline"
                >
                  <X size={16} /> Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
