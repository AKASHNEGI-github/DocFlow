import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom';

import AppLayout from './components/layout/AppLayout.jsx';
import RequireAuth from './components/layout/RequireAuth.jsx';
import RequireRole from './components/layout/RequireRole.jsx';
import { CONTENT_ROLES, ROLES } from './lib/roles.js';
import { NAV_ITEMS } from './lib/navigation.js';

import Landing from './pages/Landing.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import ResetPassword from './pages/auth/ResetPassword.jsx';

import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DocOnboard from './pages/DocOnboard.jsx';
import Draft from './pages/Draft.jsx';
import Editorial from './pages/Editorial.jsx';
import Review from './pages/Review.jsx';
import Publication from './pages/Publication.jsx';
import Live from './pages/Live.jsx';
import Deletion from './pages/Deletion.jsx';
import DocumentReader from './pages/DocumentReader.jsx';
import Profile from './pages/Profile.jsx';
import Users from './pages/admin/Users.jsx';
import NotFound from './pages/NotFound.jsx';

// handle.icon comes straight from lib/navigation.js's NAV_ITEMS - the
// same source Sidebar.jsx reads from - so a page's own heading icon can
// never drift out of sync with its sidebar icon.
export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* Public - Landing redirects to /home itself once signed in, so it doubles as "/" for both signed-out and signed-in visitors. */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<RequireAuth />}>
        {/* Full-screen reading view - deliberately outside AppLayout, no header/sidebar. */}
        <Route path="/read/:documentId" element={<DocumentReader />} />

        <Route element={<AppLayout />}>
          {/* Home and Profile are available to every authenticated role. */}
          <Route path="/home" handle={{ title: NAV_ITEMS.home.label, icon: NAV_ITEMS.home.icon }} element={<Home />} />
          <Route path="/profile" handle={{ title: NAV_ITEMS.profile.label, icon: NAV_ITEMS.profile.icon }} element={<Profile />} />

          <Route element={<RequireRole roles={CONTENT_ROLES} />}>
            <Route path="/dashboard" handle={{ title: NAV_ITEMS.dashboard.label, icon: NAV_ITEMS.dashboard.icon }} element={<Dashboard />} />
            <Route path="/doc-onboard" handle={{ title: NAV_ITEMS.docOnboard.label, icon: NAV_ITEMS.docOnboard.icon }} element={<DocOnboard />} />
            <Route path="/draft" handle={{ title: NAV_ITEMS.draft.label, icon: NAV_ITEMS.draft.icon }} element={<Draft />} />
            <Route path="/editorial" handle={{ title: NAV_ITEMS.editorial.label, icon: NAV_ITEMS.editorial.icon }} element={<Editorial />} />
            <Route path="/review" handle={{ title: NAV_ITEMS.review.label, icon: NAV_ITEMS.review.icon }} element={<Review />} />
            <Route path="/publication" handle={{ title: NAV_ITEMS.publication.label, icon: NAV_ITEMS.publication.icon }} element={<Publication />} />
            <Route path="/live" handle={{ title: NAV_ITEMS.live.label, icon: NAV_ITEMS.live.icon }} element={<Live />} />
            <Route path="/deletion" handle={{ title: NAV_ITEMS.deletion.label, icon: NAV_ITEMS.deletion.icon }} element={<Deletion />} />
          </Route>

          <Route element={<RequireRole roles={[ROLES.ADMIN]} />}>
            <Route path="/users" handle={{ title: NAV_ITEMS.users.label, icon: NAV_ITEMS.users.icon }} element={<Users />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </>,
  ),
);
