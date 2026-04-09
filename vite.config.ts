import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

function validateEnv(): Plugin {
  return {
    name: 'validate-env',
    buildStart() {
      if (!process.env.VITE_API_URL) {
        this.warn(
          'VITE_API_URL is not set. In production, ensure window.__CONFIG__.API_URL is injected via config.js.',
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tsconfigPaths(), validateEnv()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (url) => url.replace(/^\/api/, ''),
      },
    },
  },
});