import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';

// Vercel caps a serverless function's request body at 4.5 MB, and base64
// inflates a file by ~4/3 — so keep the accepted file well under that.
const MAX_SIZE = 3 * 1024 * 1024;

// Reads a File into the bare base64 payload imgbb expects (no data: prefix).
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function PhotoUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Image must be 3 MB or smaller');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      // Uploads go through our API so the imgbb key stays server-side.
      const image = await toBase64(file);
      const { data } = await api.post('/uploads/photo', { image });
      onChange(data.url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Photo upload failed');
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
        <p>Click the camera icon to upload (max 3 MB)</p>
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
