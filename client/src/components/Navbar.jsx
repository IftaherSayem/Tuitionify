import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { firebaseUser, profile, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    toast.success('Logged out');
    navigate('/');
  }

  const links = [
    { to: '/tuitions', label: 'Find Tuitions' },
    { to: '/tutors', label: 'Find Tutors' },
  ];

  const linkClass = ({ isActive }) =>
    `px-3 py-2 text-sm font-medium rounded-lg transition ${
      isActive ? 'text-brand-700 bg-brand-50' : 'text-slate-600 hover:text-brand-700 hover:bg-slate-50'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" aria-label="Tuitionify home">
          <Logo size={36} />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {firebaseUser && profile ? (
            <>
              {isAdmin && (
                <NavLink to="/admin" className="btn-ghost">
                  <ShieldCheck size={16} /> Admin
                </NavLink>
              )}
              <NavLink to="/dashboard" className="btn-ghost">
                <LayoutDashboard size={16} /> Dashboard
              </NavLink>
              <button onClick={handleLogout} className="btn-outline">
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Login</Link>
              <Link to="/register" className="btn-primary">Get Started</Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
            <hr className="my-2" />
            {firebaseUser && profile ? (
              <>
                {isAdmin && (
                  <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>
                    Admin
                  </NavLink>
                )}
                <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>
                  Dashboard
                </NavLink>
                <button onClick={() => { setOpen(false); handleLogout(); }} className="btn-outline mt-1">
                  <LogOut size={16} /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline" onClick={() => setOpen(false)}>Login</Link>
                <Link to="/register" className="btn-primary mt-1" onClick={() => setOpen(false)}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
