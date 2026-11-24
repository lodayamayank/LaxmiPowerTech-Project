// RoleBasedDashboard.jsx - Add error handling
import React, { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';

// Each role only loads its own dashboard chunk.
const Dashboard = lazy(() => import('./Admin/AdminDashboard'));
const LabourDashboard = lazy(() => import('./LabourDashboard'));
const SupervisorDashboard = lazy(() => import('./SupervisorDashboard'));
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Same markup as the Suspense fallback in App.jsx (not exported there, and importing App from a page would be circular).
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

const RoleBasedDashboard = () => {
  const navigate = useNavigate();
  
  try {
    const userString = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    console.log('🔍 RoleBasedDashboard - Checking user...');
    console.log('📦 User string from localStorage:', userString);
    console.log('🔑 Token exists:', !!token);
    
    if (!userString || !token) {
      console.error('❌ No user or token found, redirecting to login');
      navigate('/login');
      return null;
    }
    
    const user = JSON.parse(userString);
    const role = user?.role;
    
    console.log('👤 Parsed user object:', user);
    console.log('🎭 User role detected:', role);
    console.log('📋 Full user data:', JSON.stringify(user, null, 2));
    
    if (role === 'admin') {
      console.log('✅ Rendering AdminDashboard for role:', role);
      return (
        <Suspense fallback={<LoadingFallback />}>
          <Dashboard />
        </Suspense>
      );
    }
    
    if (role === 'supervisor' || role === 'subcontractor') {
      console.log('✅ Rendering SupervisorDashboard for role:', role);
      return (
        <Suspense fallback={<LoadingFallback />}>
          <SupervisorDashboard />
        </Suspense>
      );
    }
    
    if (role === 'labour' || role === 'staff') {
      console.log('✅ Rendering LabourDashboard for role:', role);
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
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Unknown Role</h1>
          <p className="text-gray-600 mb-4">Role: {role || 'undefined'}</p>
          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
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
          <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ Error Loading Dashboard</h1>
          <p className="text-gray-600 mb-4">{err.message}</p>
          <button 
            onClick={() => {
              localStorage.clear();
              navigate('/login');
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Clear Storage & Login Again
          </button>
        </div>
      </div>
    );
  }
};

export default RoleBasedDashboard;