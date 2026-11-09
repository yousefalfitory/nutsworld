// Starts a WhatsApp phone verification: creates a short code for the signed-in customer
// and returns a wa.me link that opens WhatsApp with the code already typed.
const crypto = require("crypto");

const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const WA = String(process.env.WA_BUSINESS_NUMBER || "").replace(/\D/g, "");
const TTL_MIN = 15;
const MAX_PER_HOUR = 5;

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

const sb = (path, opt = {}) =>
  fetch(SB + "/rest/v1/" + path, {
    ...opt,
    headers: { apikey: SK, "Content-Type": "application/json", ...(opt.headers || {}) }
  });

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!SB || !SK || !PK || !WA) return res.status(500).json({ ok: false, error: "config" });

  const uid = await userId(req);
  if (!uid) return res.status(401).json({ ok: false, error: "auth" });

  try {
    const pr = await sb(`profiles?select=phone,phone_verified&id=eq.${encodeURIComponent(uid)}&limit=1`);
    const p = pr.ok ? (await pr.json())[0] : null;
    if (!p || !/^\d{8,15}$/.test(String(p.phone || ""))) return res.status(400).json({ ok: false, error: "phone" });
    if (p.phone_verified) return res.status(200).json({ ok: true, verified: true });

    const since = new Date(Date.now() - 3600e3).toISOString();
    const cr = await sb(`phone_verifications?select=id&user_id=eq.${encodeURIComponent(uid)}&created_at=gt.${encodeURIComponent(since)}`);
    const recent = cr.ok ? await cr.json() : [];
    if (Array.isArray(recent) && recent.length >= MAX_PER_HOUR) return res.status(429).json({ ok: false, error: "rate" });

    // only the newest code stays valid (old ones are burned, not deleted, so they still count for the hourly limit)
    await sb(`phone_verifications?user_id=eq.${encodeURIComponent(uid)}&used_at=is.null`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ used_at: new Date().toISOString() })
    });

    const code = "NW-" + crypto.randomInt(100000, 1000000);
    const ir = await sb("phone_verifications", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: uid,
        phone: p.phone,
        code,
        expires_at: new Date(Date.now() + TTL_MIN * 60e3).toISOString()
      })
    });
    if (!ir.ok) return res.status(500).json({ ok: false, error: "server" });

    return res.status(200).json({
      ok: true,
      code,
      link: "https://wa.me/" + WA + "?text=" + encodeURIComponent(code),
      number: WA,
      expires_in: TTL_MIN * 60
    });
  } catch (_) {
    return res.status(500).json({ ok: false, error: "server" });
  }
};
