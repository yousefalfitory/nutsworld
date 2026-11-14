// Daily report: every night at 12 (Libya time) the admins get a notification with the day's numbers.
// Vercel runs it on its own (see vercel.json "crons"). On the Hobby plan it can arrive any time within that hour.
const PUSH = require("./_push");

const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const fmt = (n) => String(Math.round(Number(n) * 100) / 100);

// "250 غ" → 0.25, "1.5 كغ" → 1.5 (kg); bundles ("2 باقة") count as packs
function kg(t) {
  t = String(t || "");
  let m = t.match(/([\d.]+)\s*كغ/); if (m) return { kg: +m[1] };
  m = t.match(/([\d.]+)\s*غ/); if (m) return { kg: +m[1] / 1000 };
  m = t.match(/([\d.]+)\s*باق/); if (m) return { pack: +m[1] };
  return {};
}

module.exports = async (req, res) => {
  // only Vercel's scheduler (or someone holding CRON_SECRET) may run it
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";
  const ua = String(req.headers["user-agent"] || "");
  if (secret ? auth !== "Bearer " + secret : !/vercel-cron/i.test(ua)) return res.status(401).json({ ok: false });
  if (!SB || !SK || !PUSH.ready()) return res.status(500).json({ ok: false, error: "env" });

  // the Libyan day that just ended (UTC+2): runs at 22:00 UTC = 00:00 in Libya
  const now = Date.now() + 2 * 3600 * 1000;
  const end = new Date(Math.floor(now / 86400000) * 86400000 - 2 * 3600 * 1000);
  const start = new Date(end.getTime() - 86400000);
  // if Vercel runs it a little early (before midnight), report the day that is ending now
  const nowLy = new Date(now);
  if (nowLy.getUTCHours() >= 22) { start.setTime(start.getTime() + 86400000); end.setTime(end.getTime() + 86400000); }

  let rows = [];
  try {
    const q = "select=total,status,items&created_at=gte." + start.toISOString() + "&created_at=lt." + end.toISOString() + "&limit=1000";
    const r = await fetch(SB + "/rest/v1/orders?" + q, { headers: { apikey: SK } });
    rows = await r.json();
    if (!Array.isArray(rows)) rows = [];
  } catch (_) { rows = []; }

  const ok = rows.filter((o) => o.status !== "cancelled");
  const cancelled = rows.length - ok.length;
  const sales = ok.reduce((s, o) => s + Number(o.total || 0), 0);
  const per = new Map();
  for (const o of ok) for (const it of Array.isArray(o.items) ? o.items : []) {
    const k = kg(it.qty), cur = per.get(it.name) || { kg: 0, pack: 0, n: 0 };
    cur.kg += k.kg || 0; cur.pack += k.pack || 0; cur.n += 1;
    per.set(it.name, cur);
  }
  let top = null;
  for (const [name, v] of per) if (!top || v.n > top.v.n || (v.n === top.v.n && v.kg > top.v.kg)) top = { name, v };

  const day = new Date(start.getTime() + 2 * 3600 * 1000).toISOString().slice(0, 10).split("-").reverse().join("/");
  const body = ok.length
    ? "💰 " + fmt(sales) + " د.ل · 🛒 " + ok.length + " طلب" + (cancelled ? " · ❌ " + cancelled + " ملغي" : "") +
      (top ? "\n⭐ الأكثر: " + top.name + " (" + (top.v.kg ? fmt(top.v.kg) + " كغ" : top.v.pack + " باقة") + ")" : "")
    : "ما فيش طلبات اليوم";
  const sent = await PUSH.sendTo("role=eq.admin", { title: "📊 تقرير يوم " + day, body, url: "/staff.html", tag: "nw-daily-" + day });
  return res.status(200).json({ ok: true, day, orders: ok.length, sales: Math.round(sales * 100) / 100, sent });
};
