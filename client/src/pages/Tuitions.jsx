import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api from '../api/client';
import FilterSidebar from '../components/FilterSidebar';
import TuitionCard from '../components/TuitionCard';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';

export default function Tuitions() {
  const { isSeeker } = useAuth();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    subjects: searchParams.get('subject') ? [searchParams.get('subject')] : [],
    classLevel: '', area: '', mode: '', gender: '', minSalary: '', maxSalary: '',
  });
  const [tuitions, setTuitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => (Array.isArray(v) ? v.length : v))
      );
      const { data } = await api.get('/tuitions', { params });
      setTuitions(data);
    } catch {
      setTuitions([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const onChange = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const onReset = () =>
    setFilters({ subjects: [], classLevel: '', area: '', mode: '', gender: '', minSalary: '', maxSalary: '' });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Find Tuitions</h1>
          <p className="mt-1 text-slate-500">Browse open tuition posts from guardians &amp; students.</p>
        </div>
        {isSeeker && (
          <Link to="/post-tuition" className="btn-primary">
            <Plus size={17} /> Post a Tuition
          </Link>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <FilterSidebar
          filters={filters} onChange={onChange} onReset={onReset}
          genderLabel="Preferred tutor gender"
        />

        <div>
          {loading ? (
            <Spinner />
          ) : error ? (
            <EmptyState
              title="Couldn't load tuitions"
              message="Something went wrong while fetching posts. Please check your connection and try again."
            />
          ) : tuitions.length === 0 ? (
            <EmptyState
              title="No tuitions found"
              message="Try adjusting your filters, or check back later for new posts."
            />
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-500">{tuitions.length} tuition(s) found</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {tuitions.map((t) => (
                  <TuitionCard key={t._id} tuition={t} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
