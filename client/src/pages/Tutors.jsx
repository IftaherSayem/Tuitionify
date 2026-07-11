import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import FilterSidebar from '../components/FilterSidebar';
import TutorCard from '../components/TutorCard';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

export default function Tutors() {
  const { firebaseUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    subjects: searchParams.get('subject') ? [searchParams.get('subject')] : [],
    classLevel: '', area: '', mode: '', gender: '', minSalary: '', maxSalary: '', minRating: '',
  });
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [tutors, setTutors] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const debounceRef = useRef(null);

  function handleSearch(value) {
    setSearchText(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(value.trim());
      setPage(1);
    }, 400);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => (Array.isArray(v) ? v.length : v))
      );
      if (verifiedOnly) params.verified = 'true';
      if (query) params.q = query;
      params.page = page;
      params.limit = 12;
      const { data: result } = await api.get('/users/tutors', { params });
      setTutors(result.data);
      setTotalPages(result.totalPages);
      setTotal(result.total);

      if (firebaseUser && result.data.length) {
        const ids = result.data.map((t) => t._id);
        api.get('/tutor-bookmarks/check', { params: { tutorIds: ids } })
          .then(({ data }) => setBookmarkedIds(data))
          .catch(() => {});
      }
    } catch {
      setTutors([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filters, verifiedOnly, query, page, firebaseUser]);

  useEffect(() => { load(); }, [load]);

  async function toggleTutorBookmark(tutorId) {
    if (!firebaseUser) return toast.error('Log in to save tutors');
    try {
      const { data } = await api.post(`/tutor-bookmarks/${tutorId}`);
      setBookmarkedIds((ids) => data.bookmarked ? [...ids, tutorId] : ids.filter((id) => id !== tutorId));
    } catch {
      toast.error('Could not update bookmark');
    }
  }

  const onChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const onReset = () => {
    setFilters({ subjects: [], classLevel: '', area: '', mode: '', gender: '', minSalary: '', maxSalary: '', minRating: '' });
    setVerifiedOnly(false);
    setSearchText('');
    setQuery('');
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Find Tutors</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Browse verified university-student tutors.</p>
      </div>

      <div className="relative mt-6">
        <Search size={18} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          className="input pl-10"
          placeholder="Search tutors by name, department, or subject…"
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <label className="card flex cursor-pointer items-center gap-2 p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox" className="h-4 w-4 accent-brand-600"
              checked={verifiedOnly} onChange={(e) => { setVerifiedOnly(e.target.checked); setPage(1); }}
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
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{total} tutor(s) found</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {tutors.map((t) => (
                  <TutorCard
                    key={t._id}
                    tutor={t}
                    isBookmarked={bookmarkedIds.includes(t._id)}
                    onToggleBookmark={toggleTutorBookmark}
                  />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
