import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../state/authStore';

const ProtectedRoute: React.FC = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;