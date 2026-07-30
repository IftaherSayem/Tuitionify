import { useState } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SUBJECTS, CLASS_LEVELS, AREAS } from '../data/options';
import PhotoUpload from './PhotoUpload';

const Chips = ({ label, options, value, onToggle }) => (
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

export default function TutorProfileForm({ onDone }) {
  const { profile, setProfile, firebaseUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: profile.name || '',
    phone: profile.phone || '',
    photo: profile.photo || '',
    gender: profile.gender || '',
    university: profile.university || '',
    department: profile.department || '',
    subjects: profile.subjects || [],
    classLevels: profile.classLevels || [],
    preferredAreas: profile.preferredAreas || [],
    expectedSalary: profile.expectedSalary || '',
    mode: profile.mode || 'both',
    bio: profile.bio || '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k, val) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(val) ? f[k].filter((x) => x !== val) : [...f[k], val],
    }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put('/users/me', {
        ...form, expectedSalary: Number(form.expectedSalary) || 0,
      });
      setProfile(data);
      toast.success('Profile updated!');
      onDone?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="card space-y-5 p-6 sm:p-8">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Tutor Profile</h2>

      <PhotoUpload
        value={form.photo}
        onChange={(url) => set('photo', url)}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" placeholder="01XXXXXXXXX" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div>
          <label className="label">University</label>
          <input className="input" value={form.university} onChange={(e) => set('university', e.target.value)} />
        </div>
        <div>
          <label className="label">Department</label>
          <input className="input" value={form.department} onChange={(e) => set('department', e.target.value)} />
        </div>
        <div>
          <label className="label">Gender</label>
          <select className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="label">Expected salary (৳/month)</label>
          <input type="number" min="0" className="input" value={form.expectedSalary} onChange={(e) => set('expectedSalary', e.target.value)} />
        </div>
        <div>
          <label className="label">Preferred mode</label>
          <select className="input" value={form.mode} onChange={(e) => set('mode', e.target.value)}>
            <option value="home">Home</option>
            <option value="online">Online</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>

      <Chips label="Subjects you teach" options={SUBJECTS} value={form.subjects} onToggle={(v) => toggle('subjects', v)} />
      <Chips label="Class levels" options={CLASS_LEVELS} value={form.classLevels} onToggle={(v) => toggle('classLevels', v)} />
      <Chips label="Preferred areas" options={AREAS} value={form.preferredAreas} onToggle={(v) => toggle('preferredAreas', v)} />

      <div>
        <label className="label">Bio</label>
        <textarea
          rows={4} className="input" placeholder="Tell guardians about your teaching style and experience…"
          value={form.bio} onChange={(e) => set('bio', e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          <Save size={16} /> {busy ? 'Saving…' : 'Save Profile'}
        </button>
        <button type="button" onClick={onDone} className="btn-outline">Cancel</button>
      </div>
    </form>
  );
}
