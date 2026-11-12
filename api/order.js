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
const PUSH = require("./_push");
const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const s = (v, n = 200) => String(v == null ? "" : v).slice(0, n);
const r2 = x => Math.round(x * 100) / 100;
const num = v => { const x = Number(v); return Number.isFinite(x) ? r2(x) : 0; };
const fmt = x => String(+Number(x).toFixed(2));
const qtyAr = k => (k < 1 ? Math.round(k * 1000) + " غ" : fmt(k) + " كغ");
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

async function editOrder(uid, id, order) {
  try {
    const r = await fetch(SB + "/rest/v1/rpc/edit_order", {
      method: "POST",
      headers: { apikey: SK, "Content-Type": "application/json" },
      body: JSON.stringify({ p_user: uid, p_id: id, p_order: order })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { console.error("edit rpc failed", r.status, JSON.stringify(d)); return { ok: false, msg: String((d && d.message) || "") }; }
    return { ok: true, data: d };
  } catch (e) { console.error("edit rpc network error", e); return { ok: false, msg: "network" }; }
}

const libyaToday = () => new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 10);

// Products live in Supabase (the admin edits them from the staff page).
// Fallback (setup_10 not run yet): the built-in list above, numbered 1, 2, 3...
let catCache = null, catAt = 0;
async function catalog() {
  if (catCache && Date.now() - catAt < 30000) return catCache;
  if (SB && SK) {
    try {
      const r = await fetch(SB + "/rest/v1/products?select=id,name,price,sale_price,sale_until,available,categories(hidden)", { headers: { apikey: SK } });
      if (r.ok) {
        const a = await r.json();
        if (Array.isArray(a) && a.length) {
          const today = libyaToday(), m = new Map();
          for (const p of a) {
            const sale = p.sale_price != null && Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price) && (!p.sale_until || String(p.sale_until).slice(0, 10) >= today);
            m.set(Number(p.id), { name: p.name, price: Number(sale ? p.sale_price : p.price), ok: p.available !== false && !(p.categories && p.categories.hidden) });
          }
          catCache = m; catAt = Date.now();
          return m;
        }
      } else console.error("catalog failed", r.status);
    } catch (e) { console.error("catalog error", e); }
  }
  const m = new Map();
  D.P.forEach((p, i) => m.set(i + 1, { name: p[1], price: p[2], ok: true }));
  return m;
}

// Discount codes live in Supabase. Returns {code, kind, value}, or {err: "bad"|"used"|"full"}, or null (no code).
async function lookupCode(raw, phone, excl) {
  const code = String(raw || "").trim().toUpperCase().slice(0, 20);
  if (!code) return null;
  if (SB && SK) {
    try {
      const r = await fetch(SB + "/rest/v1/rpc/code_check", {
        method: "POST",
        headers: { apikey: SK, "Content-Type": "application/json" },
        body: JSON.stringify({ p_code: code, p_phone: String(phone || ""), p_excl: excl || null })
      });
      if (r.ok) {
        const d = await r.json();
        if (d && d.ok) return { code: d.code, kind: d.kind === "fix" ? "fix" : "pct", value: Number(d.value) };
        return { err: (d && d.err) || "bad" };
      }
      console.error("code_check failed", r.status);
    } catch (e) { console.error("code_check error", e); }
  }
  return Object.prototype.hasOwnProperty.call(D.CODES, code) ? { code, kind: "pct", value: D.CODES[code] } : { err: "bad" };
}

const PAYTXT = {
  cod: "الدفع: كاش عند الاستلام",
  pos: "الدفع: 💳 بطاقة مصرفية عند الاستلام (جهّز جهاز الدفع)",
  bank: "الدفع: تحويل مصرفي (بانتظار الإيصال على واتساب)",
  wallet: "الدفع: ✅ مدفوع من المحفظة"
};

// Authoritative price calculation: nothing the browser sends about prices is trusted.
function price(m, cd, cat) {
  const lines = m.lines;
  if (!Array.isArray(lines) || !lines.length || lines.length > 60) return { err: "bad" };
  const seen = new Set();
  const items = [];
  let sub = 0;
  // new pages send product ids (m.v = 2); older cached pages send list positions (0, 1, 2...)
  const byId = m.v === 2;
  for (const l of lines) {
    let i = Number(l && l[0]);
    const k = Number(l && l[1]);
    if (!Number.isInteger(i)) return { err: "bad" };
    if (!byId) i += 1;
    const p = cat && cat.get(i);
    if (!p || seen.has(i)) return { err: "bad" };
    if (!p.ok) return { err: "soldout", name: p.name };
    if (!(k >= 0.1 - 1e-9 && k <= 50) || Math.abs(k * 20 - Math.round(k * 20)) > 1e-6) return { err: "bad" };
    seen.add(i);
    const line = r2(p.price * k);
    sub += line;
    items.push({ name: p.name, qty: qtyAr(k), sum: fmt(line) });
  }
  sub = r2(sub);
  if (sub < D.MIN) return { err: "min" };
  // cd = the discount code checked on the server ({code, kind: "pct"|"fix", value}) or null
  const disc = !cd ? 0 : cd.kind === "fix" ? r2(Math.min(Number(cd.value), sub)) : Math.round(sub * Number(cd.value)) / 100;
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
  return { sub, disc, code: disc ? cd.code : "", delivery, where, area, km, loc, total, items };
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
      version: 8,
      push: PUSH.ready(),
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
  const eid0 = m.edit != null ? Number(m.edit) : null;
  const cd = await lookupCode(m.code, phone, Number.isInteger(eid0) ? eid0 : null);
  if (cd && cd.err) return res.status(409).json({ ok: false, error: "code_" + cd.err });
  const p = price(m, cd, await catalog());
  if (p.err) return res.status(p.err === "soldout" ? 409 : 400).json({ ok: false, error: p.err, name: p.name || undefined });
  if (Math.abs(num(m.tot) - p.total) > 0.01) return res.status(409).json({ ok: false, error: "price" });

  const pay = ["bank", "wallet", "pos"].includes(m.pay) ? m.pay : "cod";
  const uid = await userId(req);
  const t = placeTexts(p, m);
  const z = m.zone && typeof m.zone === "object" ? m.zone : {};
  const form = {
    n: name, p: phone, a: s(m.a, 200), c: s(m.c, 60), code: p.code,
    zone: z.t === "area" ? { t: "area", i: Number(z.i) } : z.t === "gps" && p.loc ? { t: "gps", lat: p.loc.lat, lon: p.loc.lon } : { t: "out" }
  };
  const row = {
    customer_name: name, phone, city: t.city, address: t.address,
    items: p.items, subtotal: p.sub, discount: p.disc, delivery: p.delivery, total: p.total,
    location: p.loc, lang: m.lang === "en" ? "en" : "ar", form, code: p.code || null
  };

  // A customer edits his own order (first 10 minutes, while it is still new). Payment stays the same.
  if (m.edit != null) {
    const eid = Number(m.edit);
    if (!Number.isInteger(eid) || eid <= 0) return res.status(400).json({ ok: false, error: "bad" });
    if (!uid) return res.status(401).json({ ok: false, error: "auth" });
    const out = await editOrder(uid, eid, row);
    if (!out.ok) {
      const g = out.msg;
      const map = /insufficient/.test(g) ? [402, "insufficient"] : /locked/.test(g) ? [409, "locked"] : /not found/.test(g) ? [404, "noorder"] : /zone/.test(g) ? [422, "zone"] : [500, "server"];
      return res.status(map[0]).json({ ok: false, error: map[1] });
    }
    const d = out.data || {};
    const etext = [
      "✏️ تعديل على الطلب #" + eid + " - عالم المكسرات",
      "العميل عدّل طلبه. الطلب بعد التعديل:",
      ...p.items.map(i => `- ${i.name}: ${i.qty} = ${i.sum} د.ل`),
      `المجموع: ${fmt(p.sub)} د.ل`,
      p.disc ? `🏷️ خصم كود ${p.code}: -${fmt(p.disc)} د.ل` : "",
      p.delivery != null ? `التوصيل: ${fmt(p.delivery)} د.ل` : "التوصيل: يُحدَّد عند التأكيد",
      `الإجمالي: ${fmt(p.total)} د.ل` + (d.old_total != null ? ` (كان ${fmt(d.old_total)} د.ل)` : ""),
      `الاسم: ${name}`,
      `الهاتف: ${phone}`,
      `المدينة: ${t.city}`,
      `العنوان: ${t.address}`,
      PAYTXT[d.payment] || ""
    ].filter(Boolean).join("\n");
    await telegram(etext);
    return res.status(200).json({ ok: true, id: eid, total: p.total, balance: d.balance == null ? null : d.balance, edited: true });
  }

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
    p.disc ? `🏷️ خصم كود ${p.code}: -${fmt(p.disc)} د.ل` : "",
    p.delivery != null ? `التوصيل: ${fmt(p.delivery)} د.ل` : "التوصيل: يُحدَّد عند التأكيد",
    `الإجمالي: ${fmt(p.total)} د.ل` + (p.delivery == null ? " (بدون التوصيل)" : ""),
    `الاسم: ${name}`,
    `الهاتف: ${phone}`,
    `المدينة: ${t.city}`,
    `العنوان: ${t.address}`,
    PAYTXT[pay],
    uid ? "👤 عميل مسجل" : ""
  ].filter(Boolean).join("\n");
  const [sent] = await Promise.all([
    telegram(text),
    // ring the staff phones (home-screen app), even when the app is closed
    PUSH.sendTo("role=in.(staff,admin)", {
      title: "🛒 طلب جديد" + (id ? " #" + id : ""),
      body: name + " · " + fmt(p.total) + " د.ل" + (t.city ? " · " + t.city : ""),
      url: "/staff.html",
      tag: "nw-order-" + (id || Date.now())
    }).catch(() => 0)
  ]);
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
