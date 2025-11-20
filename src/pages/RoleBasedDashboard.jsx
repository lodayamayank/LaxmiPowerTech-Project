// RoleBasedDashboard.jsx - Add error handling
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from './AdminDashboard';
import LabourDashboard from './LabourDashboard';

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
    
    if (role === 'admin' || role === 'supervisor') {
      console.log('✅ Rendering AdminDashboard for role:', role);
      return <Dashboard />;
    }
    
    if (role === 'labour' || role === 'subcontractor' || role === 'staff') {
      console.log('✅ Rendering LabourDashboard for role:', role);
      return <LabourDashboard />;
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