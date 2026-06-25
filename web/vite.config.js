import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy forwards /api and /uploads to the Express server so the SPA and API
// share an origin in the browser.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:4100',
      '/uploads': 'http://localhost:4100',
    },
  },
});
