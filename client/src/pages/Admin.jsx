import { useEffect, useState } from 'react';
import { ShieldCheck, Users, UserCheck, Flag, BadgeCheck, X, Check, BarChart3, Download, ShieldBan, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import VerifiedBadge from '../components/VerifiedBadge';

const TABS = [
  { key: 'tutors', label: 'Tutors', icon: Users },
  { key: 'guardians', label: 'Guardians', icon: UserCheck },
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
        {tab === 'guardians' && <GuardiansTab />}
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
  const gradientId = `spark-${title.replace(/\s/g, '')}`;
  const latest = data.length ? data[data.length - 1][dataKey] : 0;
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
        <span className="text-2xl font-bold text-slate-900 dark:text-white">{latest}</span>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey={nameKey} hide />
          <Tooltip labelFormatter={(v) => `Week: ${v}`} formatter={(v) => [v, '']} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
        </AreaChart>
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

  async function toggleRestrict(t) {
    setBusy(t._id + '-r');
    try {
      const { data } = await api.patch(`/admin/users/${t._id}/restrict`, { restricted: !t.restricted });
      setTutors((list) => list.map((x) => (x._id === t._id ? { ...x, restricted: data.restricted } : x)));
      toast.success(data.restricted ? 'Tutor restricted' : 'Restriction lifted');
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
              {t.restricted && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  Restricted
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.email}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {[t.department, t.university].filter(Boolean).join(' · ') || 'No academic info'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => toggleVerify(t)} disabled={busy === t._id} className={t.isVerified ? 'btn-outline' : 'btn-primary'}>
              {t.isVerified ? <><X size={16} /> Revoke</> : <><BadgeCheck size={16} /> Verify</>}
            </button>
            <button
              onClick={() => toggleRestrict(t)}
              disabled={busy === t._id + '-r'}
              className={t.restricted ? 'btn-outline text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/30' : 'btn-outline text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30'}
            >
              {t.restricted ? <><ShieldOff size={16} /> Unrestrict</> : <><ShieldBan size={16} /> Restrict</>}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function GuardiansTab() {
  const [guardians, setGuardians] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api.get('/admin/guardians').then(({ data }) => setGuardians(data)).catch(() => toast.error('Failed to load guardians'));
  }, []);

  async function toggleRestrict(g) {
    setBusy(g._id);
    try {
      const { data } = await api.patch(`/admin/users/${g._id}/restrict`, { restricted: !g.restricted });
      setGuardians((list) => list.map((x) => (x._id === g._id ? { ...x, restricted: data.restricted } : x)));
      toast.success(data.restricted ? 'Guardian restricted' : 'Restriction lifted');
    } catch {
      toast.error('Update failed');
    } finally {
      setBusy('');
    }
  }

  if (!guardians) return <Spinner />;
  if (!guardians.length)
    return <EmptyState title="No guardians yet" message="Guardians will appear here once they register." icon={UserCheck} />;

  return (
    <div className="space-y-3">
      {guardians.map((g) => (
        <div key={g._id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white">{g.name}</span>
              {g.restricted && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  Restricted
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{g.email}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{g.phone || 'No phone'} · Joined {new Date(g.createdAt).toLocaleDateString()}</p>
          </div>
          <button
            onClick={() => toggleRestrict(g)}
            disabled={busy === g._id}
            className={g.restricted ? 'btn-outline text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/30' : 'btn-outline text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30'}
          >
            {g.restricted ? <><ShieldOff size={16} /> Unrestrict</> : <><ShieldBan size={16} /> Restrict</>}
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
