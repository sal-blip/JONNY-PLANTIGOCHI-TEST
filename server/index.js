import { reminderAPI } from './reminders.js';
import { assets } from './generated-assets.js';

const mime = { html:'text/html; charset=utf-8', css:'text/css; charset=utf-8', js:'text/javascript; charset=utf-8', webmanifest:'application/manifest+json', svg:'image/svg+xml', png:'image/png', webp:'image/webp', woff2:'font/woff2' };
export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/')) return reminderAPI(request,env,fetch,ctx);
    if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405});
    const key = path === '/' ? '/index.html' : path;
    const value = Object.hasOwn(assets,key) ? assets[key] : null;
    if (!value) return new Response('Not found',{status:404});
    const extension = key.split('.').pop();
    const headers = { 'Content-Type':mime[extension] || 'application/octet-stream', 'Cache-Control': key.startsWith('/assets/') ? 'public,max-age=31536000,immutable' : 'no-cache', 'X-Content-Type-Options':'nosniff' };
    if (path === '/sw.js') headers['Service-Worker-Allowed'] = '/';
    const body = request.method === 'HEAD' ? null : Uint8Array.from(atob(value),c => c.charCodeAt(0));
    return new Response(body,{headers});
  }
};
