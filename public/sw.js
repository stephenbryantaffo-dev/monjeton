// Service worker dédié aux notifications push quotidiennes de Mon Jeton.
// Volontairement minimal : pas de cache d'app-shell, pas d'offline.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    payload = { title: "Mon Jeton", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Mon Jeton";
  const options = {
    body: payload.body || "N'oublie pas de noter tes dépenses du jour.",
    icon: payload.icon || "/pwa-icon-192.svg",
    badge: payload.badge || "/pwa-icon-192.svg",
    data: { url: payload.url || "/new-transaction" },
    tag: payload.tag || "daily-reminder",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
