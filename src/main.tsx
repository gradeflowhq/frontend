import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './api/axiosSetup';
import App from './app/App';
import './index.css';
import AuthBootstrap from './app/bootstrap/AuthBootstrap';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <App />
      </AuthBootstrap>
    </QueryClientProvider>
  </React.StrictMode>
);