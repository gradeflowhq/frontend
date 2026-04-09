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
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (url) => url.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3') || id.includes('@mantine/charts')) {
            return 'vendor-charts';
          }
          if (id.includes('codemirror') || id.includes('@uiw/react-codemirror') || id.includes('@codemirror')) {
            return 'vendor-codemirror';
          }
          if (id.includes('@rjsf')) {
            return 'vendor-rjsf';
          }
          if (id.includes('mantine-datatable')) {
            return 'vendor-datatable';
          }
          if (id.includes('node_modules/@mantine') || id.includes('node_modules/@tabler')) {
            return 'vendor-mantine';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});