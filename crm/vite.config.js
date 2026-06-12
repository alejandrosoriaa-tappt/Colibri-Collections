import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2018',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Split vendors so the app shell loads fast and deps cache long-term
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          vendor: ['axios', 'zustand', 'lucide-react']
        }
      }
    }
  }
})
