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
      // Dev-only proxy: the browser calls same-origin `/api/...` and Vite forwards
      // to the backend server-side, so there is no CORS in local development.
      // Leave VITE_API_BASE_URL empty in .env.local to route through this.
      proxy: {
        '/api': {
          target: 'https://atria-api.eaysdev.online',
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
