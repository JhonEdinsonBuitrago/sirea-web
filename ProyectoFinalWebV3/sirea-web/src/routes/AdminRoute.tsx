import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import AuthLoading from '../components/AuthLoading';

export default function AdminRoute({ children }: { children: JSX.Element }) {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();

  if (loading || profileLoading) {
    return <AuthLoading />;
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (profile?.rol !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
