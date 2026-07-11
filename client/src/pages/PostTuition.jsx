import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import api from '../api/client';
import { CLASS_LEVELS, SUBJECTS, AREAS, MODES, GENDER_PREF } from '../data/options';

const MultiChips = ({ label, options, value, onToggle }) => (
  <div>
    <label className="label">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value.includes(o);
        return (
          <button
            key={o} type="button" onClick={() => onToggle(o)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              active
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:text-slate-400 dark:hover:border-slate-500'
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  </div>
);

export default function PostTuition() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: '', classLevel: '', subjects: [], area: '', salary: '',
    daysPerWeek: 3, mode: 'home', genderPreference: 'any', description: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSubject = (s) =>
    setForm((f) => ({
      ...f,
      subjects: f.subjects.includes(s) ? f.subjects.filter((x) => x !== s) : [...f.subjects, s],
    }));

  async function submit(e) {
    e.preventDefault();
    if (!form.subjects.length) return toast.error('Pick at least one subject');
    if (!form.classLevel) return toast.error('Select a class level');
    if (!form.area) return toast.error('Select an area');
    setBusy(true);
    try {
      const { data } = await api.post('/tuitions', {
        ...form, salary: Number(form.salary), daysPerWeek: Number(form.daysPerWeek),
      });
      toast.success('Tuition posted!');
      navigate(`/tuitions/${data._id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not post tuition');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Post a Tuition</h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">Describe what you're looking for and let tutors apply.</p>

      <form onSubmit={submit} className="card mt-8 space-y-5 p-6 sm:p-8">
        <div>
          <label className="label">Title</label>
          <input
            required className="input" placeholder="e.g. Math tutor needed for Class 9"
            value={form.title} onChange={(e) => set('title', e.target.value)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label">Class level</label>
            <select required className="input" value={form.classLevel} onChange={(e) => set('classLevel', e.target.value)}>
              <option value="">Select…</option>
              {CLASS_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Area</label>
            <select required className="input" value={form.area} onChange={(e) => set('area', e.target.value)}>
              <option value="">Select…</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <MultiChips label="Subjects" options={SUBJECTS} value={form.subjects} onToggle={toggleSubject} />

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="label">Salary (৳/month)</label>
            <input
              type="number" min="0" required className="input" placeholder="5000"
              value={form.salary} onChange={(e) => set('salary', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Days / week</label>
            <input
              type="number" min="1" max="7" className="input"
              value={form.daysPerWeek} onChange={(e) => set('daysPerWeek', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Mode</label>
            <select className="input" value={form.mode} onChange={(e) => set('mode', e.target.value)}>
              {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Preferred tutor gender</label>
          <select className="input" value={form.genderPreference} onChange={(e) => set('genderPreference', e.target.value)}>
            {GENDER_PREF.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Details (optional)</label>
          <textarea
            rows={4} className="input" placeholder="Timing, expectations, any specific requirements…"
            value={form.description} onChange={(e) => set('description', e.target.value)}
          />
        </div>

        <button type="submit" disabled={busy} className="btn-primary w-full">
          <Plus size={17} /> {busy ? 'Posting…' : 'Post Tuition'}
        </button>
      </form>
    </div>
  );
}
