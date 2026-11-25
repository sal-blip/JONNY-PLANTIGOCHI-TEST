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
addPlugins([{
  async requestWillFetch({request}){
    const url=new URL(request.url);
    if(url.origin!==self.location.origin || url.pathname!=='/index.html' || !entry?.revision)return request;
    url.searchParams.set('release',entry.revision);
    return new Request(url.href,request);
  }
}]);
precacheAndRoute(manifest);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), {
  allowlist: [/^\/(?:index\.html)?(?:\?.*)?$/],
}));
