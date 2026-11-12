// Nuts World app helper: lets the app open and show a friendly page when there is no internet.
// It never stores orders, prices or account data; those always come fresh from the internet.
const C = "nw-shell-v1";
const SHELL = ["/", "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(C).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || r.mode !== "navigate") return; // only full page loads
  e.respondWith(
    fetch(r)
      .then((res) => {
        if (res.ok && new URL(r.url).pathname === "/") caches.open(C).then((c) => c.put("/", res.clone()));
        return res;
      })
      .catch(() =>
        caches.match("/").then(
          (m) =>
            m ||
            new Response(
              '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Tahoma,sans-serif;text-align:center;padding:40px;direction:rtl;color:#0a5c33"><h2>ما فيش إنترنت</h2><p>تأكد من الاتصال وحاول مرة ثانية.</p><button onclick="location.reload()" style="background:#2f8a57;color:#fff;border:0;border-radius:12px;padding:12px 24px;font-size:16px">إعادة المحاولة</button></body>',
              { headers: { "Content-Type": "text/html; charset=utf-8" } }
            )
        )
      )
  );
});
