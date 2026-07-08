import { BadgeCheck } from 'lucide-react';

// Small shield shown next to verified tutors. `size` controls the icon.
export default function VerifiedBadge({ size = 16, withText = false }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-brand-600"
      title="Verified IIUC student — ID checked by admin"
    >
      <BadgeCheck size={size} className="fill-brand-100 text-brand-600" />
      {withText && <span className="text-xs font-semibold">Verified</span>}
    </span>
  );
}
