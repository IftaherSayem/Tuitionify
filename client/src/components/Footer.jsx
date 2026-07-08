import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <Logo size={32} />
          <p className="mt-3 text-sm text-slate-500">
            Connecting university-student tutors with students &amp; guardians across Bangladesh.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link to="/tuitions" className="hover:text-brand-700">Find Tuitions</Link></li>
            <li><Link to="/tutors" className="hover:text-brand-700">Find Tutors</Link></li>
            <li><Link to="/register" className="hover:text-brand-700">Become a Tutor</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900">For Guardians</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link to="/post-tuition" className="hover:text-brand-700">Post a Tuition</Link></li>
            <li><Link to="/tutors" className="hover:text-brand-700">Browse Tutors</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900">About</h4>
          <p className="mt-3 text-sm text-slate-500">
            A student project built for the International Islamic University Chittagong (IIUC)
            community. Made with ❤️ in Bangladesh.
          </p>
        </div>
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Tuitionify. All rights reserved.
      </div>
    </footer>
  );
}
