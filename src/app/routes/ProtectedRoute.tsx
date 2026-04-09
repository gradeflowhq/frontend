import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '@state/authStore';

import { PATHS } from './paths';

const ProtectedRoute: React.FC = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  return accessToken ? <Outlet /> : <Navigate to={PATHS.LOGIN} replace />;
};

export default ProtectedRoute;