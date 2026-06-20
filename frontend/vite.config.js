import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Proxy API calls to the backend during local `npm run dev`.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
