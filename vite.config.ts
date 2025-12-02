import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        lock: resolve(__dirname, 'lock.html'), // FIX: Points to root lock.html
        background: resolve(__dirname, 'src/extension/background.ts'),
        content: resolve(__dirname, 'src/extension/content.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (['background', 'content', 'lock'].includes(chunkInfo.name)) {
            return '[name].js';
          }
          return '[name]-[hash].js';
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});