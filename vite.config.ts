import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chakra-vendor': ['@chakra-ui/react', '@emotion/react', '@emotion/styled'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['gl-matrix', 'react-reconciler'],
    exclude: ['@the-vedantic-coder/piper-tts-web'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  server: {
    /** Loopback only in dev (SEC-17). localhost resolves here on Windows. */
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    fs: {
      strict: true,
      allow: [path.resolve(__dirname, '.')],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        /** Quiz / Ollama can exceed the default ~120s proxy idle timeout; otherwise the UI never receives the response. */
        timeout: 600_000,
        proxyTimeout: 600_000,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});


