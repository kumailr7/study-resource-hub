self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Session Starting Soon', {
      body: data.body || 'A session you registered for is starting in 10 minutes.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'session-reminder',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
