import React from 'react';
import { Navigate } from 'react-router-dom';
import useCurrentUser from '../hooks/useCurrentUser';


export default function DocumentsRedirect() {
  const user = useCurrentUser();
  if (!user.role) return <Navigate to="/login" replace />;
  if (!user.canUseDocuments) return <Navigate to="/dashboard" replace />;
  if (user.isAdmin) return <Navigate to="/admin/projects" replace />;
  if (user.project) return <Navigate to={`/projects/${user.project}/documents`} replace />;
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center text-gray-600">
      You are not assigned to a project yet. Please ask an admin to assign you to one.
    </div>
  );
}
