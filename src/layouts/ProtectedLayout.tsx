import React, { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@api';
import Navbar from '@components/common/NavBar';
import ErrorAlert from '@components/common/ErrorAlert';
import ErrorBoundary from '@components/common/ErrorBoundary';
import UserSettingsDialog from '@components/common/UserSettingsDialog';
import { useAuthStore } from '@state/authStore';

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
    staleTime: 5 * 60 * 1000, // cache briefly
  });

  const onLogout = useCallback(async () => {
    try {
      await api.logoutAuthLogoutPost();
    } catch {
      // ignore backend errors; proceed to clear client-side
    } finally {
      clearTokens();
      // Optional: you can navigate to /login here; guards will handle it automatically
      // navigate('/login');
    }
  }, [clearTokens]);

  const username = data?.name ?? data?.email ?? 'Account';

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar username={username} onLogout={onLogout} onOpenSettings={() => setShowSettings(true)} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {isLoading && (
          <div className="alert alert-info">
            <span>Loading your account...</span>
          </div>
        )}
        {isError && <ErrorAlert error={error} />}
        {!isLoading && !isError && (
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        )}
      </main>
      <UserSettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default ProtectedLayout;