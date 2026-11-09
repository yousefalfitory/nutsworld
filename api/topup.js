const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const s = (v, n = 200) => String(v == null ? "" : v).slice(0, n);
const fmt = x => String(+Number(x).toFixed(2));

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const auth = (req.headers && req.headers.authorization) || "";
  if (!auth.startsWith("Bearer ") || !SB || !PK || !SK) return res.status(401).json({ ok: false, error: "auth" });
  let b = req.body;
  try { if (typeof b === "string") b = JSON.parse(b); } catch (_) { b = {}; }
  b = b || {};
  const amount = Number(b.amount);
  if (!Number.isFinite(amount)) return res.status(400).json({ ok: false, error: "amount" });
  try {
    const u = await fetch(SB + "/auth/v1/user", { headers: { apikey: PK, Authorization: auth } });
    if (!u.ok) return res.status(401).json({ ok: false, error: "auth" });
    const user = await u.json();
    const r = await fetch(SB + "/rest/v1/rpc/request_topup", {
      method: "POST",
      headers: { apikey: PK, Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ p_amount: amount, p_note: s(b.note, 200) || null })
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) {
      const msg = String((d && d.message) || "");
      const code = /too many/.test(msg) ? "pending" : /bad amount/.test(msg) ? "amount" : /not verified/.test(msg) ? "verify" : "server";
      return res.status(code === "server" ? 500 : 400).json({ ok: false, error: code });
    }
    const id = d;
    let who = "";
    try {
      const pr = await fetch(SB + "/rest/v1/profiles?select=full_name,phone,email&id=eq." + user.id, { headers: { apikey: SK } });
      const a = pr.ok ? await pr.json() : [];
      if (a[0]) who = `الاسم: ${a[0].full_name || ""}\nالهاتف: ${a[0].phone || ""}\nالإيميل: ${a[0].email || ""}`;
    } catch (_) {}
    const { TELEGRAM_TOKEN: token, TELEGRAM_CHAT_ID: chat } = process.env;
    if (token && chat) {
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text: `💰 طلب شحن محفظة #${id}\nالمبلغ: ${fmt(amount)} د.ل\n${who}\nبانتظار الإيصال على واتساب، ثم الموافقة من صفحة المدير.` })
      }).catch(() => {});
    }
    return res.status(200).json({ ok: true, id });
  } catch (_) {
    return res.status(500).json({ ok: false, error: "server" });
  }
};
