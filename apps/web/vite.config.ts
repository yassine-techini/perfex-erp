import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: mode === 'development',
    minify: mode === 'development' ? false : 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
          }
          // Feature chunks based on file path
          if (id.includes('/pages/finance/')) {
            return 'feature-finance';
          }
          if (id.includes('/pages/crm/')) {
            return 'feature-crm';
          }
          if (id.includes('/pages/ai/') || id.includes('/components/ai/')) {
            return 'feature-ai';
          }
          if (id.includes('/pages/hr/')) {
            return 'feature-hr';
          }
          if (id.includes('/pages/inventory/')) {
            return 'feature-inventory';
          }
          if (id.includes('/pages/projects/')) {
            return 'feature-projects';
          }
          if (id.includes('/pages/workflows/')) {
            return 'feature-workflows';
          }
        },
      },
    },
  },
}));
