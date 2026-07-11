import { useEffect, useState } from 'react';
import { ShieldCheck, Users, Flag, BadgeCheck, X, Check, BarChart3, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/client';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import VerifiedBadge from '../components/VerifiedBadge';

const TABS = [
  { key: 'tutors', label: 'Tutors', icon: Users },
  { key: 'reports', label: 'Reports', icon: Flag },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin panel</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Verify tutors, review reports, and view analytics.</p>
        </div>
      </div>

      <div className="mt-8 flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.key
                ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'tutors' && <TutorsTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/analytics').then(({ data }) => setData(data)).catch(() => toast.error('Failed to load analytics'));
  }, []);

  if (!data) return <Spinner />;

  const { counts, signupsPerWeek, tuitionsPerWeek, topSubjects, topAreas } = data;

  function exportCSV() {
    let csv = 'Metric,Value\n';
    csv += `Total Users,${counts.users.total}\n`;
    csv += `Tutors,${counts.users.tutors}\n`;
    csv += `Seekers,${counts.users.seekers}\n`;
    csv += `Total Tuitions,${counts.tuitions.total}\n`;
    csv += `Open Tuitions,${counts.tuitions.open}\n`;
    csv += `Closed Tuitions,${counts.tuitions.closed}\n`;
    csv += `Total Applications,${counts.applications.total}\n`;
    csv += `Pending Applications,${counts.applications.pending}\n`;
    csv += `Accepted Applications,${counts.applications.accepted}\n`;
    csv += `Rejected Applications,${counts.applications.rejected}\n`;
    csv += '\nWeek,Signups,Tuitions Posted\n';
    const weeks = new Set([...signupsPerWeek.map((w) => w.week), ...tuitionsPerWeek.map((w) => w.week)]);
    [...weeks].sort().forEach((w) => {
      const s = signupsPerWeek.find((x) => x.week === w)?.count || 0;
      const t = tuitionsPerWeek.find((x) => x.week === w)?.count || 0;
      csv += `${w},${s},${t}\n`;
    });
    csv += '\nTop Subjects,Count\n';
    topSubjects.forEach((s) => { csv += `${s.name},${s.count}\n`; });
    csv += '\nTop Areas,Count\n';
    topAreas.forEach((a) => { csv += `${a.name},${a.count}\n`; });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tuitionify-analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button onClick={exportCSV} className="btn-outline text-sm">
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Users" value={counts.users.total} sub={`${counts.users.tutors} tutors · ${counts.users.seekers} seekers`} />
        <StatCard label="Tuitions" value={counts.tuitions.total} sub={`${counts.tuitions.open} open · ${counts.tuitions.closed} closed`} />
        <StatCard label="Applications" value={counts.applications.total} sub={`${counts.applications.pending} pending · ${counts.applications.accepted} accepted`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Signups per Week" data={signupsPerWeek} dataKey="count" nameKey="week" color="#0f8f62" />
        <ChartCard title="Tuitions Posted per Week" data={tuitionsPerWeek} dataKey="count" nameKey="week" color="#3b82f6" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RankList title="Top Subjects" items={topSubjects} />
        <RankList title="Top Areas" items={topAreas} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{value.toLocaleString()}</p>
      {sub && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, data, dataKey, nameKey, color }) {
  return (
    <div className="card p-5">
      <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RankList({ title, items }) {
  const max = items[0]?.count || 1;
  return (
    <div className="card p-5">
      <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.name} className="flex items-center gap-3">
            <span className="w-5 text-xs font-medium text-slate-400">{i + 1}.</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">{item.name}</span>
                <span className="text-xs font-medium text-slate-500">{item.count}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TutorsTab() {
  const [tutors, setTutors] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api.get('/admin/tutors').then(({ data }) => setTutors(data)).catch(() => toast.error('Failed to load tutors'));
  }, []);

  async function toggleVerify(t) {
    setBusy(t._id);
    try {
      const { data } = await api.patch(`/admin/tutors/${t._id}/verify`, { isVerified: !t.isVerified });
      setTutors((list) => list.map((x) => (x._id === t._id ? { ...x, isVerified: data.isVerified } : x)));
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
              <span className="font-semibold text-slate-900 dark:text-white">{t.name}</span>
              {t.isVerified && <VerifiedBadge size={15} />}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.email}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {[t.department, t.university].filter(Boolean).join(' · ') || 'No academic info'}
            </p>
          </div>
          <button onClick={() => toggleVerify(t)} disabled={busy === t._id} className={t.isVerified ? 'btn-outline' : 'btn-primary'}>
            {t.isVerified ? <><X size={16} /> Revoke</> : <><BadgeCheck size={16} /> Verify</>}
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
    api.get('/admin/reports').then(({ data }) => setReports(data)).catch(() => toast.error('Failed to load reports'));
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
    open: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    reviewed: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
    dismissed: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  };

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r._id} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="chip capitalize">{r.targetType}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{r.reason}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyle[r.status]}`}>
                  {r.status}
                </span>
              </div>
              {r.details && <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{r.details}</p>}
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Reported by {r.reporter?.name || 'Unknown'} ({r.reporter?.email || '—'})
              </p>
            </div>
            {r.status === 'open' && (
              <div className="flex gap-2">
                <button onClick={() => setStatus(r, 'reviewed')} disabled={busy === r._id} className="btn-primary">
                  <Check size={16} /> Reviewed
                </button>
                <button onClick={() => setStatus(r, 'dismissed')} disabled={busy === r._id} className="btn-outline">
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
