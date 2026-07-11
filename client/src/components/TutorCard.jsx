import { Link } from 'react-router-dom';
import { MapPin, Wallet, GraduationCap, Heart } from 'lucide-react';
import { StarDisplay } from './StarRating';
import VerifiedBadge from './VerifiedBadge';
import { CURRENCY } from '../data/options';

export default function TutorCard({ tutor, isBookmarked, onToggleBookmark }) {
  return (
    <Link to={`/tutors/${tutor._id}`} className="card group relative block p-5 transition hover:shadow-md hover:-translate-y-0.5">
      {onToggleBookmark && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleBookmark(tutor._id); }}
          className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
        >
          <Heart size={18} className={isBookmarked ? 'fill-red-500 text-red-500' : ''} />
        </button>
      )}

      <div className="flex items-center gap-4">
        <img
          src={tutor.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=0f8f62&color=fff`}
          alt={tutor.name}
          className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-800"
        />
        <div className="min-w-0">
          <h3 className="flex items-center gap-1 truncate font-semibold text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-400">
            {tutor.name}
            {tutor.isVerified && <VerifiedBadge size={15} />}
          </h3>
          <p className="flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
            <GraduationCap size={13} /> {tutor.department || 'University Student'}
          </p>
          <div className="mt-1">
            <StarDisplay value={tutor.ratingAvg} count={tutor.ratingCount} size={14} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tutor.subjects?.slice(0, 4).map((s) => (
          <span key={s} className="chip">{s}</span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <MapPin size={15} className="text-slate-400 dark:text-slate-500" />
          {tutor.preferredAreas?.[0] || 'Flexible'}
          {tutor.preferredAreas?.length > 1 && ` +${tutor.preferredAreas.length - 1}`}
        </span>
        {tutor.expectedSalary > 0 && (
          <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <Wallet size={15} className="text-slate-400 dark:text-slate-500" /> {CURRENCY}{tutor.expectedSalary.toLocaleString()}/mo
          </span>
        )}
      </div>
    </Link>
  );
}
