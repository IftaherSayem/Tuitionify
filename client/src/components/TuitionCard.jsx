import { Link } from 'react-router-dom';
import { MapPin, BookOpen, CalendarDays, Wallet, Monitor, Home } from 'lucide-react';
import { CURRENCY } from '../data/options';

export default function TuitionCard({ tuition }) {
  return (
    <Link to={`/tuitions/${tuition._id}`} className="card group block p-5 transition hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">{tuition.title}</h3>
        <span className={`badge shrink-0 ${tuition.status === 'closed' ? 'bg-slate-100 text-slate-500' : ''}`}>
          {tuition.status === 'closed' ? 'Closed' : 'Open'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="chip"><BookOpen size={13} className="mr-1" /> {tuition.classLevel}</span>
        {tuition.subjects?.slice(0, 3).map((s) => (
          <span key={s} className="chip">{s}</span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm text-slate-600">
        <span className="flex items-center gap-1.5"><MapPin size={15} className="text-slate-400" /> {tuition.area}</span>
        <span className="flex items-center gap-1.5"><Wallet size={15} className="text-slate-400" /> {CURRENCY}{tuition.salary?.toLocaleString()}/mo</span>
        <span className="flex items-center gap-1.5"><CalendarDays size={15} className="text-slate-400" /> {tuition.daysPerWeek} days/week</span>
        <span className="flex items-center gap-1.5">
          {tuition.mode === 'online' ? <Monitor size={15} className="text-slate-400" /> : <Home size={15} className="text-slate-400" />}
          {tuition.mode === 'online' ? 'Online' : 'Home'}
        </span>
      </div>
    </Link>
  );
}
