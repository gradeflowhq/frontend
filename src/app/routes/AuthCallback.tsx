import { Center, Loader } from '@mantine/core';
import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';

/**
 * Handles the OIDC redirect callback.
 *
 * After AuthProvider finishes processing the authorization code,
 * this component navigates to /assessments via React Router so the
 * router state stays in sync with the browser URL.
 */
const AuthCallback: React.FC = () => {
  const { isAuthenticated, isLoading, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      void navigate('/assessments', { replace: true });
    } else {
      // Auth failed or was cancelled — return to landing page.
      void navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, error, navigate]);

  return (
    <Center style={{ minHeight: '100vh' }}>
      <Loader color="blue" />
    </Center>
  );
};

export default AuthCallback;
