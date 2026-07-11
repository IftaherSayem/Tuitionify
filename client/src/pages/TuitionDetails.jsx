import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Wallet, CalendarDays, BookOpen, Monitor, Home, User, Phone, Send, ArrowLeft, Flag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Spinner from '../components/Spinner';
import ReportModal from '../components/ReportModal';
import { useAuth } from '../context/AuthContext';
import { CURRENCY } from '../data/options';

export default function TuitionDetails() {
  const { id } = useParams();
  const { profile, isTutor, isSeeker } = useAuth();
  const [tuition, setTuition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [applications, setApplications] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);

  const isOwner = profile && tuition && String(tuition.createdBy?._id) === String(profile._id);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/tuitions/${id}`);
        setTuition(data);
      } catch {
        toast.error('Could not load tuition');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (isOwner) {
      api.get(`/tuitions/${id}/applications`).then(({ data }) => setApplications(data)).catch(() => {});
    }
  }, [isOwner, id]);

  async function apply() {
    setApplying(true);
    try {
      await api.post('/applications', { tuitionId: id, message });
      toast.success('Application sent!');
      setMessage('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not apply');
    } finally {
      setApplying(false);
    }
  }

  async function decide(appId, status) {
    try {
      await api.patch(`/applications/${appId}`, { status });
      setApplications((apps) => apps.map((a) => (a._id === appId ? { ...a, status } : a)));
      if (status === 'accepted') {
        setTuition((t) => ({ ...t, status: 'closed' }));
        toast.success('Applicant accepted — tuition closed');
      } else {
        toast('Applicant rejected');
      }
    } catch {
      toast.error('Action failed');
    }
  }

  if (loading) return <Spinner full />;
  if (!tuition) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/tuitions" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-400">
          <ArrowLeft size={16} /> Back to tuitions
        </Link>
        {profile && !isOwner && (
          <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 dark:text-slate-500">
            <Flag size={13} /> Report
          </button>
        )}
      </div>

      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{tuition.title}</h1>
          <span className={`badge ${tuition.status === 'closed' ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : ''}`}>
            {tuition.status === 'closed' ? 'Closed' : 'Open'}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="chip"><BookOpen size={13} className="mr-1" /> {tuition.classLevel}</span>
          {tuition.subjects?.map((s) => <span key={s} className="chip">{s}</span>)}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Info icon={Wallet} label="Salary" value={`${CURRENCY}${tuition.salary?.toLocaleString()} / month`} />
          <Info icon={MapPin} label="Area" value={tuition.area} />
          <Info icon={CalendarDays} label="Days per week" value={tuition.daysPerWeek} />
          <Info
            icon={tuition.mode === 'online' ? Monitor : Home}
            label="Mode" value={tuition.mode === 'online' ? 'Online' : 'Home (in-person)'}
          />
          <Info icon={User} label="Preferred tutor" value={cap(tuition.genderPreference)} />
        </div>

        {tuition.description && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Details</h3>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">{tuition.description}</p>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5 dark:border-slate-700">
          <img
            src={tuition.createdBy?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(tuition.createdBy?.name || 'U')}&background=0f8f62&color=fff`}
            alt="" className="h-10 w-10 rounded-full"
          />
          <div className="text-sm">
            <p className="font-medium text-slate-800 dark:text-slate-200">Posted by {tuition.createdBy?.name}</p>
            {isOwner && tuition.createdBy?.phone && (
              <p className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><Phone size={13} /> {tuition.createdBy.phone}</p>
            )}
          </div>
        </div>
      </div>

      {isTutor && !isOwner && tuition.status === 'open' && (
        <div className="card mt-6 p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white">Apply for this tuition</h3>
          <textarea
            rows={3} className="input mt-3" placeholder="Write a short message to the guardian (optional)…"
            value={message} onChange={(e) => setMessage(e.target.value)}
          />
          <button onClick={apply} disabled={applying} className="btn-primary mt-3">
            <Send size={16} /> {applying ? 'Sending…' : 'Send Application'}
          </button>
        </div>
      )}

      {isSeeker && !isOwner && (
        <p className="mt-6 text-center text-sm text-slate-400 dark:text-slate-500">Only tutors can apply to tuitions.</p>
      )}

      {isOwner && (
        <div className="mt-6">
          <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
            Applicants ({applications.length})
          </h3>
          {applications.length === 0 ? (
            <div className="card p-6 text-center text-sm text-slate-500 dark:text-slate-400">No applications yet.</div>
          ) : (
            <div className="space-y-3">
              {applications.map((a) => (
                <div key={a._id} className="card flex flex-wrap items-center gap-4 p-4">
                  <img
                    src={a.tutor?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.tutor?.name || 'T')}&background=0f8f62&color=fff`}
                    alt="" className="h-12 w-12 rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <Link to={`/tutors/${a.tutor?._id}`} className="font-semibold text-slate-900 hover:text-brand-700 dark:text-white dark:hover:text-brand-400">
                      {a.tutor?.name}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{a.tutor?.department}</p>
                    {a.message && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">"{a.message}"</p>}
                    {a.tutor?.phone && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Phone size={12} /> {a.tutor.phone}
                      </p>
                    )}
                  </div>
                  {a.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button onClick={() => decide(a._id, 'accepted')} className="btn-primary px-3 py-1.5 text-xs">Accept</button>
                      <button onClick={() => decide(a._id, 'rejected')} className="btn-outline px-3 py-1.5 text-xs">Reject</button>
                    </div>
                  ) : (
                    <span className={`badge ${a.status === 'rejected' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : ''}`}>
                      {cap(a.status)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType="tuition" targetId={id} />
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30">
        <Icon size={17} />
      </span>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
