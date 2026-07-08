import { Loader2 } from 'lucide-react';

export default function Spinner({ full, label = 'Loading…' }) {
  if (full) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin" size={32} />
        <span className="text-sm">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
      <Loader2 className="animate-spin" size={20} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
