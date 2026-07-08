import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import FilterSidebar from '../components/FilterSidebar';
import TutorCard from '../components/TutorCard';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

export default function Tutors() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    subjects: searchParams.get('subject') ? [searchParams.get('subject')] : [],
    classLevel: '', area: '', mode: '', gender: '', minSalary: '', maxSalary: '', minRating: '',
  });
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => (Array.isArray(v) ? v.length : v))
      );
      if (verifiedOnly) params.verified = 'true';
      const { data } = await api.get('/users/tutors', { params });
      setTutors(data);
    } catch {
      setTutors([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filters, verifiedOnly]);

  useEffect(() => { load(); }, [load]);

  const onChange = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const onReset = () => {
    setFilters({ subjects: [], classLevel: '', area: '', mode: '', gender: '', minSalary: '', maxSalary: '', minRating: '' });
    setVerifiedOnly(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Find Tutors</h1>
        <p className="mt-1 text-slate-500">Browse verified university-student tutors.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <label className="card flex cursor-pointer items-center gap-2 p-4 text-sm font-medium text-slate-700">
            <input
              type="checkbox" className="h-4 w-4 accent-brand-600"
              checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            Verified tutors only
          </label>
          <FilterSidebar
            filters={filters} onChange={onChange} onReset={onReset}
            genderLabel="Tutor gender" showRating
          />
        </div>

        <div>
          {loading ? (
            <Spinner />
          ) : error ? (
            <EmptyState
              title="Couldn't load tutors"
              message="Something went wrong while fetching tutors. Please check your connection and try again."
            />
          ) : tutors.length === 0 ? (
            <EmptyState
              title="No tutors found"
              message="Try adjusting your filters to see more tutors."
            />
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-500">{tutors.length} tutor(s) found</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {tutors.map((t) => (
                  <TutorCard key={t._id} tutor={t} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
