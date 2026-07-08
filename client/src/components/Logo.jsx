export default function Logo({ size = 36, withWordmark = true, className = '' }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="40" height="40" rx="10" fill="url(#tf-grad)" />
        {/* mortarboard */}
        <path d="M20 11 8.5 16 20 21l11.5-5L20 11Z" fill="#fff" />
        <path d="M14 19.2v4.3c0 1.6 2.7 2.9 6 2.9s6-1.3 6-2.9v-4.3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* tassel */}
        <path d="M31.5 16v5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="31.5" cy="22" r="1.6" fill="#fff" />
        <defs>
          <linearGradient id="tf-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1baf78" />
            <stop offset="1" stopColor="#0d7250" />
          </linearGradient>
        </defs>
      </svg>
      {withWordmark && (
        <span className="text-lg font-extrabold tracking-tight text-slate-900">
          Tuition<span className="text-brand-600">ify</span>
        </span>
      )}
    </span>
  );
}
