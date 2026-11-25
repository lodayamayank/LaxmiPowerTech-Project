// RoleBasedDashboard.jsx - Add error handling
import React, { lazy, Suspense } from 'react';
import { PageLoader } from '@/components/common/PageLoader';
import { ROLES } from '@/lib/constants';
import { isFieldRole } from '@/lib/roles';
import { ROUTES } from '@/lib/routes';
import { clearSession, getToken, getUserRaw } from '@/lib/session';
import { useNavigate } from 'react-router-dom';

// Each role only loads its own dashboard chunk.
const Dashboard = lazy(() => import('./AdminDashboard'));
const LabourDashboard = lazy(() => import('./LabourDashboard'));
const SupervisorDashboard = lazy(() => import('./SupervisorDashboard'));
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Same markup as the Suspense fallback in App.jsx (not exported there, and importing App from a page would be circular).
const LoadingFallback = () => <PageLoader />;

const RoleBasedDashboard = () => {
  const navigate = useNavigate();
  
  try {
    const userString = getUserRaw();
    const token = getToken();
    
    
    if (!userString || !token) {
      console.error('❌ No user or token found, redirecting to login');
      navigate(ROUTES.login);
      return null;
    }
    
    const user = JSON.parse(userString);
    const role = user?.role;
    
    
    if (role === ROLES.admin) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <Dashboard />
        </Suspense>
      );
    }
    
    if (isFieldRole(role)) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <SupervisorDashboard />
        </Suspense>
      );
    }
    
    if (role === ROLES.labour || role === ROLES.staff) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <LabourDashboard />
        </Suspense>
      );
    }
    
    console.warn('⚠️ Unknown role:', role);
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-tone-bad-fg mb-4">❌ Unknown Role</h1>
          <p className="text-ink-3 mb-4">Role: {role || 'undefined'}</p>
          <button 
            onClick={() => navigate(ROUTES.login)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-strong"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  } catch (err) {
    console.error('Error in RoleBasedDashboard:', err);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-tone-bad-fg mb-4">⚠️ Error Loading Dashboard</h1>
          <p className="text-ink-3 mb-4">{err.message}</p>
          <button 
            onClick={() => {
              clearSession({ all: true });
              navigate(ROUTES.login);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-strong"
          >
            Clear Storage & Login Again
          </button>
        </div>
      </div>
    );
  }
};

export default RoleBasedDashboard;