/* Loaded by the production service worker, including when the game is closed. */
self.addEventListener('push', event => {
  event.waitUntil(self.registration.showNotification('Your Monstera is ready 🌱', {
    body: 'Your seed’s first hour is up. Open your pocket garden to check on it.',
    icon: '/icons/icon-192.png', badge: '/leaf.svg', tag: 'plantigochi-sprout',
    data: { path: '/' },
  }));
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
