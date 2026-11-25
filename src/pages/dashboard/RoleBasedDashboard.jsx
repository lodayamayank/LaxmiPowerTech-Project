// RoleBasedDashboard.jsx - Add error handling
import React, { Suspense } from 'react';
import { TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/common/PageLoader';
import { ROLES } from '@/lib/constants';
import { isFieldRole } from '@/lib/roles';
import { ROUTES } from '@/lib/routes';
import { clearSession, getToken, getUserRaw } from '@/lib/session';
import { useNavigate } from 'react-router-dom';

// Each role only loads its own dashboard chunk.
const Dashboard = lazyWithRetry(() => import('./AdminDashboard'));
const LabourDashboard = lazyWithRetry(() => import('./LabourDashboard'));
const SupervisorDashboard = lazyWithRetry(() => import('./SupervisorDashboard'));
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
    
    console.warn('Unknown role:', role);

    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <EmptyState
          icon={TriangleAlert}
          title="We can’t open your dashboard"
          description="Your account has no role this app recognises. Sign in again, or ask an administrator to check your account."
          action={<Button onClick={() => navigate(ROUTES.login)}>Go to login</Button>}
        />
      </div>
    );
  } catch (err) {
    console.error('Error in RoleBasedDashboard:', err);
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <EmptyState
          icon={TriangleAlert}
          title="The dashboard couldn’t be loaded"
          description="Your saved sign-in details look damaged. Signing in again usually fixes this."
          action={
            <Button
              onClick={() => {
                clearSession({ all: true });
                navigate(ROUTES.login);
              }}
            >
              Sign in again
            </Button>
          }
        />
      </div>
    );
  }
};

export default RoleBasedDashboard;