// Notifications for «إدارة المتجر»: save/remove a device, send a test, tell a courier he got an order.
const P = require("./_push");
const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const H = () => ({ apikey: SK, Authorization: "Bearer " + SK, "Content-Type": "application/json" });

async function who(req) {
  const h = (req.headers && req.headers.authorization) || "";
  if (!h.startsWith("Bearer ") || !SB || !PK || !SK) return null;
  try {
    const r = await fetch(SB + "/auth/v1/user", { headers: { apikey: PK, Authorization: h } });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u || !u.id) return null;
    const r2 = await fetch(SB + "/rest/v1/profiles?select=id,role,full_name&id=eq." + u.id, { headers: H() });
    const a = await r2.json();
    return Array.isArray(a) && a[0] ? a[0] : null;
  } catch (_) { return null; }
}

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") return res.status(200).json({ ok: true, ready: P.ready(), key: P.PUB() || null });
    if (req.method !== "POST") return res.status(405).json({ ok: false });
    let b = req.body;
    try { if (typeof b === "string") b = JSON.parse(b); } catch (_) { b = {}; }
    b = b || {};
    const me = await who(req);
    if (!me || !["staff", "admin", "courier"].includes(me.role)) return res.status(403).json({ ok: false, error: "auth" });
    if (!P.ready()) return res.status(503).json({ ok: false, error: "keys" });

    if (b.action === "save") {
      const s = b.sub || {};
      if (typeof s.endpoint !== "string" || !/^https:\/\//.test(s.endpoint) || !s.keys || !s.keys.p256dh || !s.keys.auth) return res.status(400).json({ ok: false, error: "bad" });
      const row = { endpoint: s.endpoint.slice(0, 1000), user_id: me.id, role: me.role, sub: { endpoint: s.endpoint, keys: { p256dh: String(s.keys.p256dh), auth: String(s.keys.auth) } } };
      const r = await fetch(SB + "/rest/v1/push_subs?on_conflict=endpoint", { method: "POST", headers: { ...H(), Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) });
      if (!r.ok) return res.status(500).json({ ok: false, error: "db" });
      const sent = await P.sendTo("endpoint=eq." + encodeURIComponent(row.endpoint), { title: "🔔 الإشعارات شغّالة", body: "من توا يوصلك تنبيه على كل طلب جديد، حتى والتطبيق مسكّر.", url: "/staff.html", tag: "nw-test" });
      return res.status(200).json({ ok: true, sent });
    }
    if (b.action === "del") {
      if (typeof b.endpoint === "string") await fetch(SB + "/rest/v1/push_subs?endpoint=eq." + encodeURIComponent(b.endpoint) + "&user_id=eq." + me.id, { method: "DELETE", headers: H() });
      return res.status(200).json({ ok: true });
    }
    if (b.action === "hand") {
      // staff handed an order to a courier: ring the courier's phone
      if (!["staff", "admin"].includes(me.role)) return res.status(403).json({ ok: false });
      const id = Number(b.order_id);
      if (!Number.isInteger(id)) return res.status(400).json({ ok: false });
      const r = await fetch(SB + "/rest/v1/orders?select=id,courier_id,city,customer_name&id=eq." + id, { headers: H() });
      const a = await r.json();
      const o = Array.isArray(a) && a[0];
      if (!o || !o.courier_id) return res.status(404).json({ ok: false });
      const sent = await P.sendTo("user_id=eq." + o.courier_id, { title: "🛵 طلب توصيل جديد #" + o.id, body: (o.customer_name || "") + (o.city ? " · " + o.city : ""), url: "/staff.html", tag: "nw-hand-" + o.id });
      return res.status(200).json({ ok: true, sent });
    }
    return res.status(400).json({ ok: false, error: "action" });
  } catch (e) {
    console.error("push error", (e && e.stack) || e);
    return res.status(500).json({ ok: false, error: "server" });
  }
};
