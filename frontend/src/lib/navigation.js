import { House, LayoutDashboard, FilePlus2, FileText, PenSquare, ClipboardCheck, Send, Globe2, Trash2, Users, UserCircle } from 'lucide-react';

/**
 * One definition per route, reused by both Sidebar.jsx (building the
 * nav list) and router.jsx (each route's `handle`, which AppLayout
 * reads to render the page's own icon+heading). Keeping this in one
 * file means the icon shown in the sidebar for, say, Draft can never
 * silently drift out of sync with the icon shown next to the Draft page's
 * own heading - there's only one place either of them could come from.
 */
export const NAV_ITEMS = {
  home: { to: '/home', label: 'Home', icon: House },
  dashboard: { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  docOnboard: { to: '/doc-onboard', label: 'Doc Onboard', icon: FilePlus2 },
  draft: { to: '/draft', label: 'Draft', icon: FileText },
  editorial: { to: '/editorial', label: 'Editorial', icon: PenSquare },
  review: { to: '/review', label: 'Review', icon: ClipboardCheck },
  publication: { to: '/publication', label: 'Publication', icon: Send },
  live: { to: '/live', label: 'Live', icon: Globe2 },
  deletion: { to: '/deletion', label: 'Deletion', icon: Trash2 },
  users: { to: '/users', label: 'Users', icon: Users },
  profile: { to: '/profile', label: 'Profile', icon: UserCircle },
};

export const CONTENT_NAV = [
  NAV_ITEMS.home,
  NAV_ITEMS.dashboard,
  NAV_ITEMS.docOnboard,
  NAV_ITEMS.draft,
  NAV_ITEMS.editorial,
  NAV_ITEMS.review,
  NAV_ITEMS.publication,
  NAV_ITEMS.live,
  NAV_ITEMS.deletion,
];

export const ADMIN_NAV = [NAV_ITEMS.home, NAV_ITEMS.users];
