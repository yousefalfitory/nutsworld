const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const s = (v, n = 200) => String(v == null ? "" : v).slice(0, n);
const num = v => { const x = Number(v); return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0; };

async function userId(req) {
  const h = (req.headers && req.headers.authorization) || "";
  if (!h.startsWith("Bearer ") || !SB || !PK) return null;
  try {
    const r = await fetch(SB + "/auth/v1/user", { headers: { apikey: PK, Authorization: h } });
    if (!r.ok) return null;
    const u = await r.json();
    return (u && u.id) || null;
  } catch (_) { return null; }
}

async function saveOrder(row) {
  if (!SB || !SK) return null;
  try {
    const r = await fetch(SB + "/rest/v1/orders", {
      method: "POST",
      headers: { apikey: SK, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(row)
    });
    if (!r.ok) { console.error("order insert failed", r.status, await r.text()); return null; }
    const a = await r.json();
    return (a && a[0] && a[0].id) || null;
  } catch (e) { console.error("order insert error", e); return null; }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const { TELEGRAM_TOKEN: token, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!token || !chat) return res.status(500).json({ ok: false });
  let b = req.body;
  try { if (typeof b === "string") b = JSON.parse(b); } catch (_) { b = {}; }
  b = b || {};
  const items = Array.isArray(b.items) ? b.items.slice(0, 60) : [];
  if (!items.length || !s(b.name) || !s(b.phone)) return res.status(400).json({ ok: false });

  const m = b.meta && typeof b.meta === "object" ? b.meta : {};
  const uid = await userId(req);
  const id = await saveOrder({
    user_id: uid,
    customer_name: s(m.cn || b.name, 80),
    phone: s(b.phone, 30),
    city: s(b.city, 60),
    address: s(b.address, 300),
    items: items.map(i => ({ name: s(i.name, 60), qty: s(i.qty, 20), sum: s(i.sum, 20) })),
    subtotal: num(m.sub),
    discount: num(m.disc),
    delivery: m.del == null ? null : num(m.del),
    total: num(m.tot),
    payment: m.pay === "bank" ? "bank" : "cod",
    location: m.loc && typeof m.loc === "object" ? { lat: num(m.loc.lat), lon: num(m.loc.lon) } : null,
    lang: m.lang === "en" ? "en" : "ar"
  });

  const text = [
    "🛒 طلب جديد" + (id ? " #" + id : "") + " - عالم المكسرات",
    ...items.map(i => `- ${s(i.name, 60)}: ${s(i.qty, 20)} = ${s(i.sum, 20)} د.ل`),
    `المجموع: ${s(b.total, 20)} د.ل (بدون التوصيل)`,
    `الاسم: ${s(b.name, 80)}`,
    `الهاتف: ${s(b.phone, 30)}`,
    `المدينة: ${s(b.city, 60)}`,
    `العنوان: ${s(b.address, 300)}`,
    `الدفع: ${s(b.pay || "عند الاستلام", 80)}`,
    uid ? "👤 عميل مسجل" : ""
  ].filter(Boolean).join("\n");

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text })
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, id });
  } catch (_) {
    return res.status(502).json({ ok: false });
  }
};
