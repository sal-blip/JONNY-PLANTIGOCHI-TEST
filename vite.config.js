import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      injectRegister: false,
      manifest: {
        id: '/',
        name: 'Plantigochi · Pocket Garden',
        short_name: 'Plantigochi',
        description: 'Grow a pocket Monstera from a sleeping seed.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#1f3532',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/notification-badge-96.png', sizes: '96x96', type: 'image/png', purpose: 'monochrome' },
        ],
      },
      workbox: {
        cacheId: 'plantigochi',
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        importScripts: ['/plant-alerts.js'],
        globPatterns: ['**/*.{html,js,css,woff2,svg,png,webp,webmanifest,m4a,txt}'],
        inlineWorkboxRuntime: true,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/(?:index\.html)?(?:\?.*)?$/],
      },
    }),
  ],
});
