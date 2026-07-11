import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, Wallet, GraduationCap, BookOpen, Phone, Mail, ArrowLeft, Monitor, Home,
  MessageSquarePlus, Lock, Send, Clock, CheckCircle2, XCircle, Flag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Spinner from '../components/Spinner';
import { StarDisplay, StarInput } from '../components/StarRating';
import VerifiedBadge from '../components/VerifiedBadge';
import ReportModal from '../components/ReportModal';
import { useAuth } from '../context/AuthContext';
import { CURRENCY } from '../data/options';

export default function TutorProfile() {
  const { id } = useParams();
  const { isSeeker, profile, firebaseUser } = useAuth();
  const [tutor, setTutor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [requestStatus, setRequestStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  const [contactMsg, setContactMsg] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const alreadyReviewed = reviews.some((r) => String(r.author) === String(profile?._id));
  const isOwnProfile = String(profile?._id) === String(id);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get(`/users/tutors/${id}`);
      setTutor(data.tutor);
      setReviews(data.reviews);
      setRequestStatus(data.requestStatus);
    } catch {
      toast.error('Could not load tutor');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function requestContact() {
    setRequesting(true);
    try {
      await api.post('/contact-requests', { tutorId: id, message: contactMsg });
      toast.success('Contact request sent! The tutor will review it.');
      setContactMsg('');
      setRequestStatus('pending');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not send request');
    } finally {
      setRequesting(false);
    }
  }

  async function submitReview() {
    if (!rating) return toast.error('Please pick a rating');
    setPosting(true);
    try {
      await api.post('/reviews', { tutorId: id, rating, comment });
      toast.success('Review posted!');
      setRating(0); setComment('');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not post review');
    } finally {
      setPosting(false);
    }
  }

  if (loading) return <Spinner full />;
  if (!tutor) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/tutors" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-400">
          <ArrowLeft size={16} /> Back to tutors
        </Link>
        {firebaseUser && !isOwnProfile && (
          <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 dark:text-slate-500">
            <Flag size={13} /> Report
          </button>
        )}
      </div>

      <div className="card p-6 sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <img
            src={tutor.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=0f8f62&color=fff&size=128`}
            alt={tutor.name} className="h-24 w-24 rounded-2xl object-cover ring-4 ring-brand-100 dark:ring-brand-800"
          />
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              {tutor.name}
              {tutor.isVerified && <VerifiedBadge size={22} />}
            </h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              <GraduationCap size={15} /> {tutor.department}{tutor.university ? `, ${tutor.university}` : ''}
            </p>
            <div className="mt-2">
              <StarDisplay value={tutor.ratingAvg} count={tutor.ratingCount} size={18} />
            </div>
          </div>
          {tutor.expectedSalary > 0 && (
            <div className="rounded-xl bg-brand-50 px-4 py-3 text-center dark:bg-brand-900/30">
              <p className="text-xs text-brand-700 dark:text-brand-400">Expected</p>
              <p className="text-lg font-bold text-brand-700 dark:text-brand-400">{CURRENCY}{tutor.expectedSalary.toLocaleString()}</p>
              <p className="text-xs text-brand-600 dark:text-brand-500">/month</p>
            </div>
          )}
        </div>

        {tutor.bio && <p className="mt-6 whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">{tutor.bio}</p>}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Detail icon={BookOpen} label="Subjects" items={tutor.subjects} />
          <Detail icon={GraduationCap} label="Teaches" items={tutor.classLevels} />
          <Detail icon={MapPin} label="Preferred areas" items={tutor.preferredAreas} />
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30">
              {tutor.mode === 'online' ? <Monitor size={17} /> : <Home size={17} />}
            </span>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Mode</p>
              <p className="text-sm font-medium capitalize text-slate-800 dark:text-slate-200">{tutor.mode || 'Flexible'}</p>
            </div>
          </div>
        </div>
      </div>

      {!isOwnProfile && (
        <ContactSection
          tutor={tutor} isSeeker={isSeeker} loggedIn={!!firebaseUser}
          requestStatus={requestStatus} contactMsg={contactMsg}
          setContactMsg={setContactMsg} onRequest={requestContact} requesting={requesting}
        />
      )}

      {isSeeker && !alreadyReviewed && (
        <div className="card mt-6 p-6">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <MessageSquarePlus size={18} /> Leave a review
          </h3>
          <div className="mt-3">
            <StarInput value={rating} onChange={setRating} />
          </div>
          <textarea
            rows={3} className="input mt-3" placeholder="Share your experience with this tutor…"
            value={comment} onChange={(e) => setComment(e.target.value)}
          />
          <button onClick={submitReview} disabled={posting} className="btn-primary mt-3">
            {posting ? 'Posting…' : 'Post Review'}
          </button>
        </div>
      )}

      <div className="mt-6">
        <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Reviews ({reviews.length})</h3>
        {reviews.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500 dark:text-slate-400">No reviews yet.</div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r._id} className="card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{r.authorName}</p>
                  <StarDisplay value={r.rating} size={14} />
                </div>
                {r.comment && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={id} />
    </div>
  );
}

function ContactSection({ tutor, isSeeker, loggedIn, requestStatus, contactMsg, setContactMsg, onRequest, requesting }) {
  if (tutor.contactVisible) {
    return (
      <div className="card mt-6 border-brand-200 bg-brand-50/40 p-6 dark:border-brand-700 dark:bg-brand-900/20">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <CheckCircle2 size={18} className="text-brand-600" /> Contact details
        </h3>
        <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
          {tutor.phone && (
            <p className="flex items-center gap-2"><Phone size={15} className="text-brand-600" /> {tutor.phone}</p>
          )}
          {tutor.email && (
            <p className="flex items-center gap-2"><Mail size={15} className="text-brand-600" /> {tutor.email}</p>
          )}
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <LockedCard>
        <Link to="/login" className="btn-primary mt-3">Log in to request contact</Link>
      </LockedCard>
    );
  }

  if (!isSeeker) {
    return (
      <LockedCard note="Only guardians/students can request a tutor's contact." />
    );
  }

  if (requestStatus === 'pending') {
    return (
      <div className="card mt-6 p-6">
        <p className="flex items-center gap-2 text-sm font-medium text-amber-600">
          <Clock size={17} /> Request sent — waiting for the tutor to approve.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">You'll see the contact details here once approved.</p>
      </div>
    );
  }
  if (requestStatus === 'declined') {
    return (
      <div className="card mt-6 p-6">
        <p className="flex items-center gap-2 text-sm font-medium text-red-500">
          <XCircle size={17} /> The tutor declined this contact request.
        </p>
      </div>
    );
  }

  return (
    <LockedCard>
      <textarea
        rows={2} className="input mt-3" placeholder="Optional: introduce yourself and your tuition need…"
        value={contactMsg} onChange={(e) => setContactMsg(e.target.value)}
      />
      <button onClick={onRequest} disabled={requesting} className="btn-primary mt-3">
        <Send size={16} /> {requesting ? 'Sending…' : 'Request Contact'}
      </button>
    </LockedCard>
  );
}

function LockedCard({ children, note }) {
  return (
    <div className="card mt-6 p-6">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
        <Lock size={18} className="text-slate-400 dark:text-slate-500" /> Contact details are private
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {note || "To protect our tutors, phone & email are shared only after the tutor approves your request."}
      </p>
      {children}
    </div>
  );
}

function Detail({ icon: Icon, label, items }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30">
        <Icon size={17} />
      </span>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        {items?.length ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {items.map((i) => <span key={i} className="chip">{i}</span>)}
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">—</p>
        )}
      </div>
    </div>
  );
}
