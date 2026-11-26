/* Service worker: push upozornenia a inštalácia aplikácie na plochu */
const VERSION = "f61-v1";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = {title: "Fabrika 61", body: e.data && e.data.text()}; }
  e.waitUntil(self.registration.showNotification(d.title || "Fabrika 61", {
    body: d.body || "",
    icon: "icons/icon-192.png",
    badge: "icons/badge-96.png",
    data: {link: d.link || "./"},
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL(e.notification.data?.link || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(list => {
    for (const c of list) if (c.url.startsWith(self.registration.scope)) { c.focus(); return; }
    return self.clients.openWindow(url);
  }));
});
