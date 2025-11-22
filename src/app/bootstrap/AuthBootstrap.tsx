import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAuthStore } from '../../state/authStore';

type Props = { children: React.ReactNode };

const AuthBootstrap: React.FC<Props> = ({ children }) => {
  const { refreshToken, setTokens, clearTokens, markBootstrapped } = useAuthStore.getState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        if (refreshToken) {
          const res = await api.refreshAuthRefreshPost({ refresh_token: refreshToken });
          setTokens(res.data);
        }
      } catch {
        clearTokens();
      } finally {
        markBootstrapped();
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="alert alert-info">
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthBootstrap;