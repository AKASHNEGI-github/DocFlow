import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES } from '../../lib/roles.js';

/**
 * `roles` is the allow-list for this branch of routes. Redirects (rather
 * than showing a bare "forbidden" page) to somewhere that role actually
 * has - admin has no document phases, so it goes to Users; every content
 * role has no Users page, so it goes to Home.
 */
export default function RequireRole({ roles }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) {
    return <Navigate to={user?.role === ROLES.ADMIN ? '/users' : '/home'} replace />;
  }
  return <Outlet />;
}
