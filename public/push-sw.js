self.addEventListener('push', e => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'Efficiency', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.title,
      renotify: true,
      data: { url: '/today' },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url ?? '/today'));
});
