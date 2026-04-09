import { Center, Loader } from '@mantine/core';
import React, { useEffect, useState } from 'react';

import { api } from '@api';
import { useAuthStore } from '@state/authStore';

type Props = { children: React.ReactNode };

const AuthBootstrap: React.FC<Props> = ({ children }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { refreshToken, setTokens, clearTokens } = useAuthStore.getState();
      try {
        if (refreshToken) {
          const res = await api.refreshAuthRefreshPost({ refresh_token: refreshToken });
          setTokens(res.data);
        }
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader color="blue" />
      </Center>
    );
  }

  return <>{children}</>;
};

export default AuthBootstrap;