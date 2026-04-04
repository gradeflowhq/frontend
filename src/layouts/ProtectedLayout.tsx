import { AppShell, Alert, Container } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { api } from '@api';
import ErrorBoundary from '@components/common/ErrorBoundary';
import Navbar from '@components/common/NavBar';
import UserSettingsDialog from '@components/common/UserSettingsDialog';
import { useAuthStore } from '@state/authStore';
import { getErrorMessages } from '@utils/error';

import type { MeResponse } from '@api/models';

const ProtectedLayout: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const clearTokens = useAuthStore((s) => s.clearTokens);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.meAuthMeGet();
      return res.data as MeResponse;
    },
    staleTime: 5 * 60 * 1000,
  });

  const onLogout = useCallback(() => {
    void (async () => {
      try {
        await api.logoutAuthLogoutPost();
        notifications.show({ color: 'green', message: 'Logged out' });
      } catch {
        notifications.show({ color: 'red', message: 'Logout failed' });
      } finally {
        clearTokens();
      }
    })();
  }, [clearTokens]);

  const username = data?.name ?? data?.email ?? 'Account';

  return (
    <AppShell header={{ height: 60 }} withBorder>
      <AppShell.Header>
        <Navbar username={username} onLogout={onLogout} onOpenSettings={() => setShowSettings(true)} />
      </AppShell.Header>
      <AppShell.Main>
        <Container size="xl" px="md" py="lg">
          {isLoading && (
            <Alert color="blue" mb="md">Loading your account...</Alert>
          )}
          {isError && (
            <Alert color="red" mb="md">{getErrorMessages(error).join(' ')}</Alert>
          )}
          {!isLoading && !isError && (
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          )}
        </Container>
      </AppShell.Main>
      <UserSettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </AppShell>
  );
};

export default ProtectedLayout;
