import { Star } from 'lucide-react';

// Display-only star rating. Pass `value` (0–5) and optional `count`.
export function StarDisplay({ value = 0, count, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
          />
        ))}
      </span>
      {typeof count === 'number' && (
        <span className="text-xs text-slate-500">
          {value ? value.toFixed(1) : 'New'}{count ? ` (${count})` : ''}
        </span>
      )}
    </span>
  );
}

// Interactive picker for a review form.
export function StarInput({ value, onChange, size = 28 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="transition hover:scale-110"
          aria-label={`${i} star`}
        >
          <Star
            size={size}
            className={i <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
          />
        </button>
      ))}
    </div>
  );
}
