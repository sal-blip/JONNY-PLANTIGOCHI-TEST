import { reminderAPI } from './reminders.js';
import { audioRange } from '../src/mediaRange.js';
import {updatePage} from './updatePage.js';
import { assets } from './generated-assets.js';

const mime = { json:'application/json', html:'text/html; charset=utf-8', css:'text/css; charset=utf-8', js:'text/javascript; charset=utf-8', webmanifest:'application/manifest+json', svg:'image/svg+xml', png:'image/png', webp:'image/webp', woff2:'font/woff2', m4a:'audio/mp4', mp3:'audio/mpeg', txt:'text/plain; charset=utf-8' };
export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/')) return reminderAPI(request,env,fetch,ctx);
    if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405});
    if(path==='/update'){
      const entry=atob(assets['/index.html']).match(/<script[^>]+src="(\/assets\/[^"]+\.js)"/)?.[1];
      if(!entry)return new Response('Game build unavailable',{status:503});
      return new Response(request.method==='HEAD'?null:updatePage(entry),{headers:{'Content-Type':mime.html,'Cache-Control':'no-store'}});
    }
    const key = path === '/' ? '/index.html' : path;
    const value = Object.hasOwn(assets,key) ? assets[key] : null;
    if (!value) return new Response('Not found',{status:404});
    const extension = key.split('.').pop();
    const headers = { 'Content-Type':mime[extension] || 'application/octet-stream', 'Cache-Control': ['/game-release.json','/sw.js','/index.html'].includes(key) ? 'no-store' : key.startsWith('/assets/') ? 'public,max-age=31536000,immutable' : 'no-cache', 'X-Content-Type-Options':'nosniff' };
    if (path === '/sw.js') headers['Service-Worker-Allowed'] = '/';
    const audio=extension==='mp3' || extension==='m4a';
    if (audio) headers['Accept-Ranges']='bytes';
    const body = request.method === 'HEAD' ? null : Uint8Array.from(atob(value),c => c.charCodeAt(0));
    if (audio && body && request.headers.has('Range') && !request.headers.has('If-Range')) {
      return audioRange(new Blob([body]),request.headers.get('Range'),headers);
    }
    return new Response(body,{headers});
  }
};
