import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const loginTime = localStorage.getItem('loginTime');
  const maxAge = 1000 * 60 * 60 * 8; // 8 hours

  const isExpired = !token || !loginTime || Date.now() - loginTime > maxAge;
  const isAdmin = user?.role === 'super_admin' || user?.role === 'office_staff';

  if (isExpired || !isAdmin) {
    localStorage.clear();
    return <Navigate to="/login" />;
  }

  return children;
};

export default AdminRoute;
