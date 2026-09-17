import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, ChevronDown, LogOut, UserCircle, Sun, Moon, FileCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { ROLE_LABELS } from '../../lib/roles.js';

function initials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * The one header for the whole app, spanning full width above both the
 * sidebar and the content - not two separate bars (a sidebar-header +ac
 * page-topbar) like an earlier pass had. Hamburger, then the app's own
 * logo/name, stay fixed here on every page regardless of the sidebar's
 * collapsed state; each page's own icon+title now lives in AppLayout's
 * content area instead of a second bar.
 */
export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { collapsed, toggle: toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-nav-border bg-nav-bg px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-nav-text hover:bg-nav-bg-hover hover:text-nav-text-emphasis"
        >
          <Menu size={19} strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-600 text-white">
            <FileCheck size={14} strokeWidth={2.5} />
          </div>
          <span className="whitespace-nowrap font-display text-base font-semibold text-nav-text-emphasis">DocFlow</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-nav-text hover:bg-nav-bg-hover hover:text-nav-text-emphasis"
        >
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        <div className="relative" ref={ref}>
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-nav-bg-hover">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-600 text-xs font-semibold text-white">
              {initials(user?.fullName)}
            </div>
            <div className="hidden text-left leading-tight sm:block">
              <p className="text-sm font-medium text-nav-text-emphasis">{user?.fullName}</p>
              <p className="text-xs text-nav-text-muted">{ROLE_LABELS[user?.role]}</p>
            </div>
            <ChevronDown size={15} className="text-nav-text-muted" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-ink-200/70 bg-paper-raised py-1 shadow-lg">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/profile');
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-ink-700 hover:bg-paper-sunken"
              >
                <UserCircle size={16} /> Profile
              </button>
              <button onClick={handleLogout} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-status-rejected hover:bg-status-rejected-bg">
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
