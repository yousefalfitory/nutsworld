// Nuts World «إدارة المتجر»: notifications only (its own worker, separate from the shop's)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: e.data ? e.data.text() : "" }; }
  try {
    if (typeof d.badge === "number" && self.navigator && self.navigator.setAppBadge) {
      d.badge > 0 ? self.navigator.setAppBadge(d.badge).catch(() => {}) : self.navigator.clearAppBadge().catch(() => {});
    }
  } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(d.title || "إدارة المتجر", {
      body: d.body || "",
      icon: "/icons/staff-192.png",
      badge: "/icons/favicon-48.png",
      tag: d.tag || undefined,
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 150, 300, 150, 600],
      data: { url: "/staff.html" }
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) if (new URL(c.url).pathname === "/staff.html" && "focus" in c) return c.focus();
      return self.clients.openWindow("/staff.html");
    })
  );
});
