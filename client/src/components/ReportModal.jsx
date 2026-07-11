import { useState } from 'react';
import { X, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

const REASONS = [
  'Fake or impersonating profile',
  'Fake or misleading tuition post',
  'Inappropriate behaviour',
  'Spam or scam',
  'Other',
];

// Reusable report dialog. targetType: 'user' | 'tuition'.
export default function ReportModal({ open, onClose, targetType, targetId }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit() {
    if (!reason) return toast.error('Please choose a reason');
    setBusy(true);
    try {
      await api.post('/reports', { targetType, targetId, reason, details });
      toast.success('Report submitted. Thank you!');
      onClose();
      setReason(''); setDetails('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not submit report');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Flag size={18} className="text-red-500" /> Report
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"><X size={20} /></button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Reason</label>
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select a reason…</option>
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Details (optional)</label>
            <textarea
              rows={3} className="input" placeholder="Add anything that helps us review this…"
              value={details} onChange={(e) => setDetails(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={submit} disabled={busy} className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500">
            {busy ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
