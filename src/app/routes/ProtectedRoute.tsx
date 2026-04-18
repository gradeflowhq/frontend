import { Center, Loader } from '@mantine/core';
import React from 'react';
import { useAuth } from 'react-oidc-context';
import { Outlet } from 'react-router-dom';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, signinRedirect } = useAuth();

  if (isLoading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader color="blue" />
      </Center>
    );
  }

  if (!isAuthenticated) {
    void signinRedirect();
    return null;
  }

  return <Outlet />;
};

export default ProtectedRoute;