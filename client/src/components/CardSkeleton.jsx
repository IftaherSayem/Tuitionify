export default function CardSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-label="Loading results" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card p-5">
          <div className="flex items-center gap-4">
            <div className="skeleton h-14 w-14 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-6 w-24 rounded-full" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="skeleton h-4" />
            <div className="skeleton h-4" />
          </div>
        </div>
      ))}
    </div>
  );
}