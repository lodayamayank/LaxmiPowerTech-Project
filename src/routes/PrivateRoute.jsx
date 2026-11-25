import React from 'react';
import { ROUTES } from '@/lib/routes';
import { clearSession, getLoginTime, getToken, isSessionExpired } from '@/lib/session';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

/**
 * Guards authenticated routes. Used as a layout route (`<Route element={<PrivateRoute />}>`, renders the
 * matched child through <Outlet />) or, as before, wrapped around one element (`<PrivateRoute>...</PrivateRoute>`).
 *
 * Without a token, or with an expired session (8 hours, SESSION_MAX_AGE_MS), it redirects to /login at once, before
 * any protected page renders. This is a convenience for the UI only: it is NOT a security boundary. The backend
 * must authenticate and authorize every request on its own (api/client.js reacts to 401 and 403 responses).
 * There are no role checks here yet.
 */
const PrivateRoute = ({ children }) => {
  const token = getToken();
  const loginTime = getLoginTime();
  const location = useLocation();

  if (!token || !loginTime) {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  }

  // Logins last 8 hours (SESSION_MAX_AGE_MS).
  if (isSessionExpired()) {
    clearSession({ all: true }); // remove token, user, etc.
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  }

  return children ?? <Outlet />;
};

export default PrivateRoute;
