import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { ROLES } from '../../lib/roles.js';
import { CONTENT_NAV, ADMIN_NAV } from '../../lib/navigation.js';

// Kept in one place so AppLayout's content offset can never drift out of
// sync with the sidebar's own rendered width.
export const SIDEBAR_OFFSET = { expanded: 'pl-60', collapsed: 'pl-20' };

export default function Sidebar() {
  const { user } = useAuth();
  const { collapsed } = useSidebar();
  const isAdmin = user?.role === ROLES.ADMIN;
  const navItems = isAdmin ? ADMIN_NAV : CONTENT_NAV;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-nav-border bg-nav-bg pt-16 transition-[width] duration-150 ${
        collapsed ? 'w-20' : 'w-60'
      }`}
    >
      <nav className={`flex-1 space-y-1 overflow-y-auto py-3 thin-scroll ${collapsed ? 'px-2' : 'px-3'}`}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              /* border-l is the fix here: a solid accent-colored edge plus a
                 translucent accent tint ties the active item back to the
                 rest of the page - every button, link, and badge outside
                 the sidebar uses this exact same accent color, so the
                 active item visibly shares a palette with the content
                 beside it. (Originally written when this rail was dark;
                 the accent tie-in matters just as much now that it's
                 light - a plain grey active state would still read as
                 disconnected from the rest of the app's color story.) */
              `flex rounded-r-lg border-l-[3px] text-sm font-medium transition-colors ${
                collapsed ? 'flex-col items-center gap-1 px-1 py-2.5' : 'flex-row items-center gap-3 px-2.5 py-2'
              } ${
                isActive
                  ? 'border-accent-500 bg-accent-500/15 text-nav-text-emphasis'
                  : 'border-transparent text-nav-text hover:bg-nav-bg-hover hover:text-nav-text-emphasis'
              }`
            }
          >
            <item.icon size={collapsed ? 19 : 17} strokeWidth={2} className="shrink-0" />
            <span className={collapsed ? 'text-center text-[10px] leading-tight' : ''}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
