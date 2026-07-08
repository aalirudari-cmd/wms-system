import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Stockhaus WMS',
        short_name: 'Stockhaus',
        description: 'Warehouse Management System — PDA scanner interface',
        theme_color: '#0E1217',
        background_color: '#0E1217',
        display: 'standalone',
        start_url: '/pda',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // App shell + API GETs are cached so the PDA keeps working in dead
        // zones; scan confirmations are queued client-side (see pda/offlineQueue.ts)
        // and replayed on reconnect rather than relying on background sync here.
        runtimeCaching: [
          {
            urlPattern: /\/api\/(products|locations)\/.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'wms-lookups', networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
