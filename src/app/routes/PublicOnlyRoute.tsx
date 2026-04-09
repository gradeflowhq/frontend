import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '@state/authStore';

import { PATHS } from './paths';

const PublicOnlyRoute: React.FC = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  // If logged in, send to assessments; otherwise render the public route content
  return accessToken ? <Navigate to={PATHS.ASSESSMENTS} replace /> : <Outlet />;
};

export default PublicOnlyRoute;