import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@state/authStore';

const PublicOnlyRoute: React.FC = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  // If logged in, send to assessments; otherwise render the public route content
  return accessToken ? <Navigate to="/assessments" replace /> : <Outlet />;
};

export default PublicOnlyRoute;