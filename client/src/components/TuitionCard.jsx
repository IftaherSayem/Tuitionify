import { Link } from 'react-router-dom';
import { MapPin, BookOpen, CalendarDays, Wallet, Monitor, Home } from 'lucide-react';
import { CURRENCY } from '../data/options';

export default function TuitionCard({ tuition, isBookmarked, onToggleBookmark }) {
  return (
    <Link to={`/tuitions/${tuition._id}`} className="card group block p-5 transition hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-400">{tuition.title}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {onToggleBookmark && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleBookmark(tuition._id); }}
              className={`transition hover:scale-110 ${isBookmarked ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 hover:text-brand-600 dark:text-slate-500 dark:hover:text-brand-400'}`}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
            </button>
          )}
          <span className={`badge shrink-0 ${tuition.status === 'closed' ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : ''}`}>
            {tuition.status === 'closed' ? 'Closed' : 'Open'}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="chip"><BookOpen size={13} className="mr-1" /> {tuition.classLevel}</span>
        {tuition.subjects?.slice(0, 3).map((s) => (
          <span key={s} className="chip">{s}</span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1.5"><MapPin size={15} className="text-slate-400 dark:text-slate-500" /> {tuition.area}</span>
        <span className="flex items-center gap-1.5"><Wallet size={15} className="text-slate-400 dark:text-slate-500" /> {CURRENCY}{tuition.salary?.toLocaleString()}/mo</span>
        <span className="flex items-center gap-1.5"><CalendarDays size={15} className="text-slate-400 dark:text-slate-500" /> {tuition.daysPerWeek} days/week</span>
        <span className="flex items-center gap-1.5">
          {tuition.mode === 'online' ? <Monitor size={15} className="text-slate-400 dark:text-slate-500" /> : <Home size={15} className="text-slate-400 dark:text-slate-500" />}
          {tuition.mode === 'online' ? 'Online' : 'Home'}
        </span>
      </div>
    </Link>
  );
}
