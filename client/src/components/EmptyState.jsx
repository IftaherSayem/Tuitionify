import { SearchX } from 'lucide-react';

export default function EmptyState({ title = 'Nothing found', message, icon: Icon = SearchX, action }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon size={26} />
      </span>
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      {message && <p className="max-w-sm text-sm text-slate-500">{message}</p>}
      {action}
    </div>
  );
}
