import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:       'http://localhost:3000',
        changeOrigin: true,
        secure:       false
      }
    }
  },
  preview: {
    port: parseInt(process.env.PORT) || 4173,
    host: '0.0.0.0'
  },
  build: {
    outDir:      'dist',
    sourcemap:   false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          state:  ['zustand'],
          http:   ['axios']
        }
      }
    }
  }
});
