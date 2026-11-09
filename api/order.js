// Server copy of the price list, areas and discount codes (must match the store page).
const D = {
  P: [
    ["اللوز", "لوز طايب مالح", 140],
    ["اللوز", "لوز طايب بلا ملح", 140],
    ["اللوز", "لوز مدخن", 140],
    ["اللوز", "لوز خزايني", 110],
    ["اللوز", "لوز ني", 135],
    ["اللوز", "لوز مزلّط", 130],
    ["مكسرات فاخرة", "كاجو كبير", 185],
    ["مكسرات فاخرة", "كاجو مدخن", 185],
    ["مكسرات فاخرة", "فستق أمريكي", 205],
    ["مكسرات فاخرة", "فستق مدخن", 205],
    ["مكسرات فاخرة", "مكاديميا", 85],
    ["مكسرات فاخرة", "حبهان محمص", 580],
    ["المشكّل", "مشكل عادي", 160],
    ["المشكّل", "مشكل مدخن", 175],
    ["المشكّل", "مشكل متبل", 120],
    ["المشكّل", "مشكل باربيكيو", 175],
    ["سامينسا وبذور", "سامينسا سوداء", 40],
    ["سامينسا وبذور", "سامينسا بيضاء معدلة", 60],
    ["سامينسا وبذور", "سامينسا بيضاء بلا ملح", 45],
    ["سامينسا وبذور", "سامينسا مقشرة متبلة", 50],
    ["سامينسا وبذور", "سامينسا صفراء", 45],
    ["سامينسا وبذور", "بذور اليقطين", 65],
    ["حمص وكاكاوية", "حمص مشوي", 50],
    ["حمص وكاكاوية", "حمص طايب", 45],
    ["حمص وكاكاوية", "حمص بالسمسم", 50],
    ["حمص وكاكاوية", "حمص متبل", 50],
    ["حمص وكاكاوية", "حمص مالح", 50],
    ["حمص وكاكاوية", "كاكاوية", 50],
    ["حمص وكاكاوية", "كاكاوية بالصوص", 45],
    ["حمص وكاكاوية", "كاكاوية بالسمسم", 30],
    ["حمص وكاكاوية", "كاكاوية بالسكر", 30],
    ["حمص وكاكاوية", "كاكاوية بالسمسم والعسل", 50],
    ["حمص وكاكاوية", "كاكاوية توفي", 50],
    ["حمص وكاكاوية", "بليلة", 60],
    ["قهوة", "قهوة برازيلية", 115],
    ["قهوة", "قهوة برازيلية بالكسر", 115],
    ["قهوة", "قهوة برازيلية بالحبهان", 125],
    ["زبيب وحلويات", "زبيب أسود", 65],
    ["زبيب وحلويات", "زبيب أصفر", 65],
    ["زبيب وحلويات", "تشيبس", 35],
    ["زبيب وحلويات", "حلوى جيلي", 50],
    ["زبيب وحلويات", "بسكويت فيفا", 75],
    ["زبيب وحلويات", "بسكويت مقرمش", 35],
    ["زبيب وحلويات", "بسكويت أولد", 75],
    ["زبيب وحلويات", "شكلاطة شرشور", 45]
  ],
  AREAS: [
    ["المقاصبة", "Al-Maqasba", 10],
    ["المقاوبة", "Al-Maqawba", 10],
    ["عباد", "Abbad", 10],
    ["القوشي", "Al-Qushi", 10],
    ["الرويسات", "Al-Ruwaisat", 10],
    ["أبوشعالة", "Abu Shaalah", 10],
    ["اقزير", "Aqzeer", 10],
    ["الشواهدة", "Al-Shawahida", 10],
    ["الشراكسة", "Al-Sharakisa", 10],
    ["الجزيرة", "Al-Jazira", 15],
    ["يدر", "Yadar", 10],
    ["الرملة", "Al-Ramla", 15],
    ["الزروق", "Al-Zarouq", 15],
    ["الهبارة", "Al-Hubara", 15],
    ["السكيرات", "Al-Sukayrat", 15],
    ["الرعيضات", "Al-Ruaidat", 15],
    ["قصر أحمد", "Qasr Ahmed", 20],
    ["طمينة", "Tamina", 20],
    ["كرزاز", "Karzaz", 20],
    ["الغيران", "Al-Ghiran", 20],
    ["زاوية المحجوب", "Zawiyat Al-Mahjoub", 20],
    ["أبوروية", "Abu Ruwaya", 20],
    ["الدافنية", "Al-Dafniya", 25],
    ["زريق", "Zreeq", 25],
    ["الصوالح", "Al-Sawalih", 10],
    ["زمورة", "Zamoura", 10],
    ["الجهانات", "Al-Jahanat", 10]
  ],
  MIN: 40,
  SHOP: [32.3671881, 15.0931824],
  PR: {"base": 5, "km": 2, "min": 10, "max": 40, "f": 1.3, "out": 40},
  CODES: {"YF": 10}
};
const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const s = (v, n = 200) => String(v == null ? "" : v).slice(0, n);
const r2 = x => Math.round(x * 100) / 100;
const num = v => { const x = Number(v); return Number.isFinite(x) ? r2(x) : 0; };
const fmt = x => String(+Number(x).toFixed(2));
const qtyAr = k => (k < 1 ? k * 1000 + " غ" : fmt(k) + " كغ");
const hav = (a, b, c, d) => {
  const r = Math.PI / 180;
  const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
};

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

async function walletOrder(uid, order) {
  try {
    const r = await fetch(SB + "/rest/v1/rpc/create_wallet_order", {
      method: "POST",
      headers: { apikey: SK, "Content-Type": "application/json" },
      body: JSON.stringify({ p_user: uid, p_order: order })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { console.error("wallet rpc failed", r.status, JSON.stringify(d)); return { ok: false, msg: String((d && d.message) || "") }; }
    return { ok: true, data: d };
  } catch (e) { console.error("wallet rpc network error", e); return { ok: false, msg: "network" }; }
}

// Authoritative price calculation: nothing the browser sends about prices is trusted.
function price(m) {
  const lines = m.lines;
  if (!Array.isArray(lines) || !lines.length || lines.length > 60) return { err: "bad" };
  const seen = new Set();
  const items = [];
  let sub = 0;
  for (const l of lines) {
    const i = Number(l && l[0]), k = Number(l && l[1]);
    if (!Number.isInteger(i) || i < 0 || i >= D.P.length || seen.has(i)) return { err: "bad" };
    if (!(k >= 0.25 && k <= 50) || Math.abs(k * 4 - Math.round(k * 4)) > 1e-9) return { err: "bad" };
    seen.add(i);
    const line = r2(D.P[i][2] * k);
    sub += line;
    items.push({ name: D.P[i][1], qty: qtyAr(k), sum: fmt(line) });
  }
  sub = r2(sub);
  if (sub < D.MIN) return { err: "min" };
  const code = String(m.code || "").trim().toUpperCase();
  const pct = Object.prototype.hasOwnProperty.call(D.CODES, code) ? D.CODES[code] : 0;
  const disc = pct ? Math.round(sub * pct) / 100 : 0;
  const z = m.zone && typeof m.zone === "object" ? m.zone : {};
  let delivery = null, where = "out", area = "", km = null, loc = null;
  if (z.t === "area") {
    const a = D.AREAS[Number(z.i)];
    if (!a) return { err: "bad" };
    delivery = a[2]; where = "area"; area = a[0];
  } else if (z.t === "gps") {
    const lat = Number(z.lat), lon = Number(z.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { err: "bad" };
    loc = { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) };
    const d = hav(D.SHOP[0], D.SHOP[1], lat, lon);
    if (d <= D.PR.out) {
      const rd = d * D.PR.f;
      delivery = Math.min(D.PR.max, Math.max(D.PR.min, Math.round(D.PR.base + D.PR.km * rd)));
      where = "gps"; km = rd;
    }
  }
  const total = r2(sub - disc + (delivery || 0));
  return { sub, disc, code: pct ? code : "", delivery, where, area, km, loc, total, items };
}

function placeTexts(p, m) {
  const city = p.where === "area" ? "مصراتة - " + p.area
    : p.where === "gps" ? "مصراتة - حسب الموقع"
    : "خارج مصراتة - " + s(m.c, 60);
  const parts = [];
  if (p.loc) parts.push("📍 https://maps.google.com/?q=" + p.loc.lat + "," + p.loc.lon);
  parts.push(p.delivery != null
    ? "توصيل " + fmt(p.delivery) + " د.ل" + (p.km != null ? " (~" + p.km.toFixed(1) + " كم)" : "") + "، الإجمالي " + fmt(p.total) + " د.ل"
    : "التوصيل يُحدَّد عند التأكيد");
  parts.push(s(m.a, 200));
  return { city: s(city, 80), address: s(parts.join(" | "), 400) };
}

async function telegram(text) {
  const { TELEGRAM_TOKEN: token, TELEGRAM_CHAT_ID: chat } = process.env;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text })
    });
    return r.ok;
  } catch (_) { return false; }
}

async function main(req, res) {
  if (req.method === "GET") {
    // health check: open /api/order in the browser. Shows only yes/no flags, never secrets.
    return res.status(200).json({
      ok: true,
      version: 3,
      catalog: !!D,
      products: D ? D.P.length : 0,
      supabase: !!(SB && SK && PK),
      telegram: !!(process.env.TELEGRAM_TOKEN && process.env.TELEGRAM_CHAT_ID)
    });
  }
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const { TELEGRAM_TOKEN: token, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!token || !chat) return res.status(500).json({ ok: false });
  let b = req.body;
  try { if (typeof b === "string") b = JSON.parse(b); } catch (_) { b = {}; }
  b = b || {};
  const m = b.meta && typeof b.meta === "object" ? b.meta : {};
  if (!Array.isArray(m.lines) || !D) {
    // wallet payments need the server price list; without it we must not pretend to charge
    if (m.pay === "wallet") return res.status(503).json({ ok: false, error: "server" });
    return legacy(req, res, b, m);
  }

  const name = s(m.n || b.name, 80), phone = s(b.phone, 30);
  if (!name || !phone) return res.status(400).json({ ok: false, error: "bad" });
  const p = price(m);
  if (p.err) return res.status(400).json({ ok: false, error: p.err });
  if (Math.abs(num(m.tot) - p.total) > 0.01) return res.status(409).json({ ok: false, error: "price" });

  const pay = m.pay === "bank" ? "bank" : m.pay === "wallet" ? "wallet" : "cod";
  const uid = await userId(req);
  const t = placeTexts(p, m);
  const row = {
    customer_name: name, phone, city: t.city, address: t.address,
    items: p.items, subtotal: p.sub, discount: p.disc, delivery: p.delivery, total: p.total,
    location: p.loc, lang: m.lang === "en" ? "en" : "ar"
  };

  let id = null, balance = null;
  if (pay === "wallet") {
    if (!uid) return res.status(401).json({ ok: false, error: "auth" });
    if (p.delivery == null) return res.status(422).json({ ok: false, error: "zone" });
    const out = await walletOrder(uid, row);
    if (!out.ok) {
      const insufficient = /insufficient/.test(out.msg), verify = /not verified/.test(out.msg);
      return res.status(insufficient ? 402 : verify ? 403 : 500).json({ ok: false, error: insufficient ? "insufficient" : verify ? "verify" : "server" });
    }
    id = out.data && out.data.id; balance = out.data && out.data.balance;
  } else {
    id = await saveOrder({ ...row, user_id: uid, payment: pay });
  }

  const text = [
    "🛒 طلب جديد" + (id ? " #" + id : "") + " - عالم المكسرات",
    ...p.items.map(i => `- ${i.name}: ${i.qty} = ${i.sum} د.ل`),
    `المجموع: ${fmt(p.sub)} د.ل`,
    p.disc ? `خصم كود ${p.code}: -${fmt(p.disc)} د.ل` : "",
    p.delivery != null ? `التوصيل: ${fmt(p.delivery)} د.ل` : "التوصيل: يُحدَّد عند التأكيد",
    `الإجمالي: ${fmt(p.total)} د.ل` + (p.delivery == null ? " (بدون التوصيل)" : ""),
    `الاسم: ${name}`,
    `الهاتف: ${phone}`,
    `المدينة: ${t.city}`,
    `العنوان: ${t.address}`,
    pay === "wallet" ? "الدفع: ✅ مدفوع من المحفظة" : pay === "bank" ? "الدفع: تحويل مصرفي (بانتظار الإيصال على واتساب)" : "الدفع: عند الاستلام",
    uid ? "👤 عميل مسجل" : ""
  ].filter(Boolean).join("\n");
  const sent = await telegram(text);
  if (!sent && !id) return res.status(502).json({ ok: false });
  return res.status(200).json({ ok: true, id, total: p.total, balance });
}

module.exports = async (req, res) => {
  try {
    return await main(req, res);
  } catch (e) {
    console.error("order error", (e && e.stack) || e);
    return res.status(500).json({ ok: false, error: "server" });
  }
};

// Old pages (cached before the update) still work: no wallet, totals as sent.
async function legacy(req, res, b, m) {
  const items = Array.isArray(b.items) ? b.items.slice(0, 60) : [];
  if (!items.length || !s(b.name) || !s(b.phone)) return res.status(400).json({ ok: false });
  const uid = await userId(req);
  const id = await saveOrder({
    user_id: uid,
    customer_name: s(m.cn || b.name, 80), phone: s(b.phone, 30), city: s(b.city, 60), address: s(b.address, 300),
    items: items.map(i => ({ name: s(i.name, 60), qty: s(i.qty, 20), sum: s(i.sum, 20) })),
    subtotal: num(m.sub), discount: num(m.disc), delivery: m.del == null ? null : num(m.del), total: num(m.tot),
    payment: m.pay === "bank" ? "bank" : "cod",
    location: m.loc && typeof m.loc === "object" ? { lat: num(m.loc.lat), lon: num(m.loc.lon) } : null,
    lang: m.lang === "en" ? "en" : "ar"
  });
  const text = [
    "🛒 طلب جديد" + (id ? " #" + id : "") + " - عالم المكسرات",
    ...items.map(i => `- ${s(i.name, 60)}: ${s(i.qty, 20)} = ${s(i.sum, 20)} د.ل`),
    `المجموع: ${s(b.total, 20)} د.ل (بدون التوصيل)`,
    `الاسم: ${s(b.name, 80)}`, `الهاتف: ${s(b.phone, 30)}`, `المدينة: ${s(b.city, 60)}`, `العنوان: ${s(b.address, 300)}`,
    `الدفع: ${s(b.pay || "عند الاستلام", 80)}`,
    uid ? "👤 عميل مسجل" : ""
  ].filter(Boolean).join("\n");
  const sent = await telegram(text);
  return res.status(sent ? 200 : 502).json({ ok: sent, id });
}

module.exports._price = price;
