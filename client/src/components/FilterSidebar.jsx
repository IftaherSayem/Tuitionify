import { SlidersHorizontal, X } from 'lucide-react';
import { CLASS_LEVELS, SUBJECTS, AREAS, MODES, GENDER_PREF } from '../data/options';

const RATINGS = [
  { value: '4', label: '4★ & up' },
  { value: '3', label: '3★ & up' },
  { value: '2', label: '2★ & up' },
];

// Controlled filter panel. `filters` is an object; `onChange(key, value)`.
// `filters.subjects` is an array (multi-select). `showRating` adds a rating filter.
export default function FilterSidebar({ filters, onChange, onReset, genderLabel = 'Gender', showRating = false }) {
  const field = (label, key, options, withEmpty = 'All') => (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={filters[key] || ''} onChange={(e) => onChange(key, e.target.value)}>
        <option value="">{withEmpty}</option>
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>{o}</option>
          ) : (
            <option key={o.value} value={o.value}>{o.label}</option>
          )
        )}
      </select>
    </div>
  );

  const selectedSubjects = filters.subjects || [];
  const toggleSubject = (s) =>
    onChange('subjects', selectedSubjects.includes(s)
      ? selectedSubjects.filter((x) => x !== s)
      : [...selectedSubjects, s]);

  return (
    <aside className="card sticky top-20 h-fit p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <SlidersHorizontal size={18} /> Filters
        </h3>
        <button onClick={onReset} className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-700">
          <X size={13} /> Reset
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Subjects</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => {
              const active = selectedSubjects.includes(s);
              return (
                <button
                  key={s} type="button" onClick={() => toggleSubject(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {field('Class Level', 'classLevel', CLASS_LEVELS)}
        {field('Area', 'area', AREAS)}
        {field('Mode', 'mode', MODES)}
        {field(genderLabel, 'gender', GENDER_PREF.filter((g) => g.value !== 'any'))}
        {showRating && field('Rating', 'minRating', RATINGS, 'Any')}

        <div>
          <label className="label">Salary range (৳/month)</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" placeholder="Min" className="input"
              value={filters.minSalary || ''} onChange={(e) => onChange('minSalary', e.target.value)}
            />
            <span className="text-slate-400">–</span>
            <input
              type="number" min="0" placeholder="Max" className="input"
              value={filters.maxSalary || ''} onChange={(e) => onChange('maxSalary', e.target.value)}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
