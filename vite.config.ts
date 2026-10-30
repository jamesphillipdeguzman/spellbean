import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-vendor': ['pdfjs-dist'],
          'xlsx-vendor': ['xlsx'],
          'react-vendor': ['react', 'react-dom', 'zustand'],
        },
      },
    },
  },
});
