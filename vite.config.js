import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH: "/" en Netlify o Vercel; "/nombre-del-repo/" en GitHub Pages (lo pone el workflow).
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  server: { port: 5173, strictPort: true }, // siempre el 5173; si está ocupado, avisa en vez de cambiar de puerto
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // cuando publicas una versión nueva, la app se actualiza sola
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'FinApp · Mis finanzas',
        short_name: 'FinApp',
        description: 'Reparte tu plata en espacios y lleva tus ingresos y gastos. Tus datos quedan en tu Google Drive.',
        lang: 'es-CO',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#6D28D9',
        background_color: '#F6F3FD',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Guarda la app completa en el dispositivo para que abra sin internet.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fuentes-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'fuentes', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
});
