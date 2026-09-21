self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'Haango update', body: event.data?.text() || 'You have a new update.' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Haango update', {
      body: data.body || 'You have a new update from Haango.',
      tag: data.tag || 'haango-update',
      icon: '/S_Blue.png',
      badge: '/S_Blue.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => 'focus' in client);
      if (existingClient) {
        existingClient.navigate(targetUrl);
        return existingClient.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});