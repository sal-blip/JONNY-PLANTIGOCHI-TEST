import { clientsClaim, setCacheNameDetails } from 'workbox-core';
import { addPlugins, cleanupOutdatedCaches, createHandlerBoundToURL, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { audioRange } from './mediaRange.js';

importScripts('/plant-alerts.js');
setCacheNameDetails({prefix: 'plantigochi'});
self.skipWaiting();
self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')event.waitUntil(self.skipWaiting());
});
clientsClaim();

// Match media probes before the generic precache route returns the full file.
registerRoute(({request, url, sameOrigin}) =>
  sameOrigin && /^\/(?:music|records)\/.+\.(?:mp3|m4a)$/.test(url.pathname)
    && request.headers.has('Range') && !request.headers.has('If-Range'),
  async ({request}) => {
    const full = await matchPrecache(new URL(request.url).pathname);
    if (!full) return fetch(request);
    return audioRange(await full.blob(), request.headers.get('Range'), full.headers);
  }
);
const manifest=self.__WB_MANIFEST;
const entry=manifest.find(asset=>asset.url==='index.html');
const shellURL=new URL(entry.shellPath,self.location.origin).href;
const total=new Set(manifest.map(asset=>asset.url)).size;
let completed=0,lastReport=0;
addPlugins([{
  async requestWillFetch({request}){
    const url=new URL(request.url);
    if(url.origin!==self.location.origin || url.pathname!=='/index.html')return request;
    // Keep the logical /index.html cache key. Fetch immutable bytes so a stale
    // or transformed public HTML response cannot block an installed update.
    return new Request(shellURL,{credentials:'same-origin',integrity:entry.integrity});
  },
  async fetchDidSucceed({request,response}){
    if(request.url!==shellURL || !response.ok)return response;
    const headers=new Headers(response.headers);
    headers.set('Content-Type','text/html; charset=utf-8');
    headers.delete('Content-Encoding');
    headers.delete('Content-Length');
    return new Response(response.body,{status:response.status,headers});
  },
  handlerDidComplete({event,response,error}){
    if(event.type!=='install' || !response || error)return;
    completed++;
    const now=Date.now();
    if(completed!==total && now-lastReport<300)return;
    lastReport=now;
    const message={type:'GAME_CACHE_PROGRESS',completed,total};
    // Claiming clients happens after activation. During the install, the
    // visible game can still be controlled by its previous worker.
    void self.clients.matchAll({type:'window',includeUncontrolled:true})
      .then(clients=>{for(const client of clients)client.postMessage(message);})
      .catch(()=>{});
  }
}]);
precacheAndRoute(manifest);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), {
  allowlist: [/^\/(?:index\.html)?(?:\?.*)?$/],
}));
