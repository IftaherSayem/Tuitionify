import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import FilterSidebar from '../components/FilterSidebar';
import TuitionCard from '../components/TuitionCard';
import Pagination from '../components/Pagination';
import CardSkeleton from '../components/CardSkeleton';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';

export default function Tuitions() {
  const { isSeeker, firebaseUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    subjects: searchParams.get('subject') ? [searchParams.get('subject')] : [],
    classLevel: '', area: '', mode: '', gender: '', minSalary: '', maxSalary: '',
  });
  const [tuitions, setTuitions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const debounceRef = useRef(null);

  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

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
      if (query) params.q = query;
      params.page = page;
      params.limit = 12;
      const { data: result } = await api.get('/tuitions', { params });
      setTuitions(result.data);
      setTotalPages(result.totalPages);
      setTotal(result.total);

      if (firebaseUser && result.data.length) {
        const ids = result.data.map((t) => t._id);
        api.get('/bookmarks/check', { params: { tuitionIds: ids } })
          .then(({ data: bms }) => setBookmarkedIds(new Set(bms)))
          .catch(() => {});
      }
    } catch {
      setTuitions([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filters, query, page, firebaseUser]);

  useEffect(() => { load(); }, [load]);

  async function toggleBookmark(tuitionId) {
    if (!firebaseUser) return;
    try {
      const { data } = await api.post(`/bookmarks/${tuitionId}`);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        data.bookmarked ? next.add(tuitionId) : next.delete(tuitionId);
        return next;
      });
    } catch {
      toast.error('Could not update bookmark');
    }
  }

  const onChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const onReset = () => {
    setFilters({ subjects: [], classLevel: '', area: '', mode: '', gender: '', minSalary: '', maxSalary: '' });
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Find Tuitions</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Browse open tuition posts from guardians &amp; students.</p>
        </div>
        {isSeeker && (
          <Link to="/post-tuition" className="btn-primary">
            <Plus size={17} /> Post a Tuition
          </Link>
        )}
      </div>

      <div className="relative mt-6">
        <Search size={18} className="absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          className="input pl-10"
          placeholder="Search tuitions by title, subject, or description…"
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <FilterSidebar
          filters={filters} onChange={onChange} onReset={onReset}
          genderLabel="Preferred tutor gender"
        />

        <div>
          {loading ? (
            <CardSkeleton />
          ) : error ? (
            <EmptyState
              title="Couldn't load tuitions"
              message="Something went wrong while fetching posts. Please check your connection and try again."
              action={<button className="btn-primary" onClick={load}>Try again</button>}
            />
          ) : tuitions.length === 0 ? (
            <EmptyState
              title="No tuitions found"
              message="Try adjusting your filters, or check back later for new posts."
              action={<button className="btn-outline" onClick={onReset}>Clear filters</button>}
            />
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{total} tuition(s) found</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {tuitions.map((t) => (
                  <TuitionCard
                    key={t._id}
                    tuition={t}
                    isBookmarked={bookmarkedIds.has(t._id)}
                    onToggleBookmark={firebaseUser ? toggleBookmark : undefined}
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
