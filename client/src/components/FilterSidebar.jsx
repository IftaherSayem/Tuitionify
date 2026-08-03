import { useState } from 'react';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { CLASS_LEVELS, SUBJECTS, AREAS, MODES, GENDER_PREF } from '../data/options';

const RATINGS = [
  { value: '4', label: '4★ & up' },
  { value: '3', label: '3★ & up' },
  { value: '2', label: '2★ & up' },
];

// Single-value filter keys, counted for the badge on the collapsed mobile header.
const SCALAR_KEYS = ['classLevel', 'area', 'mode', 'gender', 'minRating', 'minSalary', 'maxSalary'];

export default function FilterSidebar({ filters, onChange, onReset, genderLabel = 'Gender', showRating = false }) {
  // On phones/tablets the panel would otherwise push every result below the
  // fold, so it starts collapsed. The lg: classes keep it always open on desktop.
  const [open, setOpen] = useState(false);

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

  const activeCount = selectedSubjects.length + SCALAR_KEYS.filter((k) => filters[k]).length;

  return (
    <aside className="card h-fit p-5 lg:sticky lg:top-20">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="filter-panel"
          className="flex flex-1 items-center gap-2 font-semibold text-slate-900 dark:text-white lg:pointer-events-none"
        >
          <SlidersHorizontal size={18} /> Filters
          {activeCount > 0 && <span className="badge">{activeCount}</span>}
          <ChevronDown
            size={18}
            className={`ml-auto text-slate-400 transition-transform lg:hidden ${open ? 'rotate-180' : ''}`}
          />
        </button>
        <button
          onClick={onReset}
          className="hidden shrink-0 items-center gap-1 text-xs text-slate-500 hover:text-brand-700 lg:flex dark:text-slate-400 dark:hover:text-brand-400"
        >
          <X size={13} /> Reset
        </button>
      </div>

      <div id="filter-panel" className={`space-y-4 ${open ? 'mt-5' : 'hidden'} lg:mt-5 lg:block`}>
        <div>
          <label className="label">Subjects</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => {
              const active = selectedSubjects.includes(s);
              return (
                <button
                  key={s} type="button" onClick={() => toggleSubject(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    active
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-500'
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
            <span className="text-slate-400 dark:text-slate-500">–</span>
            <input
              type="number" min="0" placeholder="Max" className="input"
              value={filters.maxSalary || ''} onChange={(e) => onChange('maxSalary', e.target.value)}
            />
          </div>
        </div>

        <button onClick={onReset} className="btn-outline w-full lg:hidden">
          <X size={14} /> Reset filters
        </button>
      </div>
    </aside>
  );
}
