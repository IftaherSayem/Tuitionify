import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  open, onClose, onConfirm, title, message,
  confirmText = 'Delete', busyText = 'Deleting…', busy,
  // Optional: demand the user type this word before the button unlocks. Left
  // unset for ordinary deletes (a tuition, a bookmark) which are re-creatable;
  // set for the ones that are not, so the confirm cannot be cleared by reflex.
  requireText,
}) {
  const [typed, setTyped] = useState('');

  // A reopened modal must start locked again, not inherit the last answer.
  useEffect(() => { if (open) setTyped(''); }, [open]);

  if (!open) return null;

  const locked = Boolean(requireText) && typed.trim() !== requireText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <AlertTriangle size={18} className="text-red-500" /> {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{message}</p>

        {requireText && (
          <label className="mt-4 block">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Type <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{requireText}</span> to confirm
            </span>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="input mt-1 font-mono"
              placeholder={requireText}
            />
          </label>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={busy || locked}
            className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? busyText : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
