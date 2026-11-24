import React from 'react';
import { ROUTES } from '@/lib/routes';
import { clearSession, getLoginTime, getToken, isSessionExpired } from '@/lib/session';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const token = getToken();
  const loginTime = getLoginTime();

  if (!token || !loginTime) {
    return <Navigate to={ROUTES.login} />;
  }

  // Logins last 8 hours (SESSION_MAX_AGE_MS).
  if (isSessionExpired()) {
    clearSession({ all: true }); // remove token, user, etc.
    return <Navigate to={ROUTES.login} />;
  }

  return children;
};

export default PrivateRoute;
