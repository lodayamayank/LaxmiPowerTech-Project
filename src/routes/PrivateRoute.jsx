import React from 'react';
import { queryClient } from '@/lib/queryClient';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const loginTime = localStorage.getItem('loginTime');
  const maxAge = 1000 * 60 * 60 * 8; // 8 hours in milliseconds

  if (!token || !loginTime) {
    return <Navigate to="/login" />;
  }

  const isExpired = Date.now() - parseInt(loginTime, 10) > maxAge;

  if (isExpired) {
    localStorage.clear(); // remove token, user, etc.
    queryClient.clear();
    return <Navigate to="/login" />;
  }

  return children;
};

export default PrivateRoute;
