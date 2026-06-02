import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Split the heaviest deps into their own chunks so they don't bloat the
      // initial paint and they cache independently across deploys. Monaco and
      // Sandpack are the biggest offenders (~500 KB+ each).
      rollupOptions: {
        output: {
          manualChunks: {
            monaco: ['@monaco-editor/react'],
            sandpack: ['@codesandbox/sandpack-react'],
            privy: ['@privy-io/react-auth'],
            firebase: [
              'firebase/app',
              'firebase/auth',
              'firebase/firestore',
              'firebase/analytics',
            ],
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },
  };
});
