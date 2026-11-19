/* A payload-free push wakes the worker. The latest local care schedule supplies
   the message even when the garden is closed, and an offline rescue replaces it. */
let pending = Promise.resolve();
async function notifyGarden() {
  const cache = await caches.open('plantigochi-notices');
  const schedule = await (await cache.match('/notice-schedule'))?.json();
  const now = Date.now();
  async function notify(kind,title,body,due) {
    const key = '/notice-delivered-' + kind;
    if (due && (await (await cache.match(key))?.text()) === String(due)) return;
    await self.registration.showNotification(title,{body,icon:'/icons/icon-192.png',badge:'/leaf.svg',tag:'plantigochi-'+kind,data:{path:'/'}});
    if (due) await cache.put(key,new Response(String(due)));
  }
  if (!schedule) return notify('growth','Time to check your Monstera 🌱','Open your pocket garden to see what it needs.');
  if (schedule.expires && now >= schedule.expires) return;
  if (schedule.criticalDue && now >= schedule.criticalDue) {
    const rot = schedule.reason === 'rot';
    await notify('care',rot ? 'Your Monstera needs drainage' : 'Your Monstera is very thirsty',
      rot ? 'Open Care and drain the pot to save its roots.' : 'Give it water while there is still time.',schedule.criticalDue);
  }
  if (schedule.due && now >= schedule.due) await notify('growth','Monstera milestone 🌿','Your growth timer is up. Visit your garden.',schedule.due);
}
self.addEventListener('push', event => {
  pending = pending.catch(()=>{}).then(notifyGarden);
  event.waitUntil(pending);
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const garden = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (garden) return garden.focus();
    return self.clients.openWindow('/');
  })());
});
