import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_SIZE = 5 * 1024 * 1024;
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

export default function PhotoUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_SIZE) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Upload failed');
      onChange(data.data.display_url);
    } catch (err) {
      toast.error('Photo upload failed');
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0">
        <img
          src={value || `https://ui-avatars.com/api/?name=U&background=0f8f62&color=fff&size=128`}
          alt="Profile"
          className="h-20 w-20 rounded-full object-cover ring-2 ring-brand-100 dark:ring-brand-800"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-md transition hover:bg-brand-700 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </button>
      </div>
      <div className="text-sm text-slate-500 dark:text-slate-400">
        <p className="font-medium text-slate-700 dark:text-slate-300">Profile photo</p>
        <p>Click the camera icon to upload (max 5 MB)</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
