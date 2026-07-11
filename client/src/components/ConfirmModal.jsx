import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ open, onClose, onConfirm, title, message, confirmText = 'Delete', busy }) {
  if (!open) return null;

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

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={onConfirm} disabled={busy} className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500">
            {busy ? 'Deleting…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
