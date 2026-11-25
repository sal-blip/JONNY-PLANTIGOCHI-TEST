import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      injectRegister: false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        id: '/',
        name: 'Plantigochi · Pocket Garden',
        short_name: 'Plantigochi',
        description: 'Grow a pocket Monstera from a sleeping seed.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f7f5e9',
        theme_color: '#1f3532',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/notification-badge-96.png', sizes: '96x96', type: 'image/png', purpose: 'monochrome' },
        ],
      },
      injectManifest: {
        // Verify the entry page before activating a worker. A stale HTML
        // response can otherwise point a newly installed app to an older bundle.
        manifestTransforms: [async entries => {
          const html=await readFile(new URL('./dist/index.html',import.meta.url));
          const integrity='sha256-'+createHash('sha256').update(html).digest('base64');
          return {manifest:entries.map(entry=>entry.url==='index.html'?{...entry,integrity}:entry)};
        }],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globIgnores: ['social/**'],
        globPatterns: ['**/*.{html,js,css,woff2,svg,png,webp,webmanifest,m4a,mp3,txt}'],
      },
    }),
  ],
});
