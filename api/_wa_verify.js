// Checks the 6-digit code the customer typed (sent to their WhatsApp by api/wa_start).
// 5 wrong tries burn the code. On success the phone number on the account becomes verified.
const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const MAX_TRIES = 5;

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
  if (!SB || !SK || !PK) return res.status(500).json({ ok: false, error: "config" });
  const uid = await userId(req);
  if (!uid) return res.status(401).json({ ok: false, error: "auth" });

  let b = req.body;
  try { if (typeof b === "string") b = JSON.parse(b); } catch (_) { b = {}; }
  const code = String((b && b.code) || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(code)) return res.status(400).json({ ok: false, error: "code" });

  try {
    const now = new Date().toISOString();
    const r = await sb(`phone_verifications?select=id,phone,code,tries&user_id=eq.${encodeURIComponent(uid)}&used_at=is.null&expires_at=gt.${encodeURIComponent(now)}&order=created_at.desc&limit=1`);
    const row = r.ok ? (await r.json())[0] : null;
    if (!row) return res.status(400).json({ ok: false, error: "expired" });

    if (row.code !== code) {
      const tries = (row.tries || 0) + 1;
      await sb(`phone_verifications?id=eq.${row.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(tries >= MAX_TRIES ? { tries, used_at: now } : { tries })
      });
      return res.status(400).json({ ok: false, error: tries >= MAX_TRIES ? "expired" : "wrong", left: Math.max(0, MAX_TRIES - tries) });
    }

    // a number that is already verified on another account stays there
    const o = await sb(`profiles?select=id&phone=eq.${encodeURIComponent(row.phone)}&phone_verified=is.true&id=neq.${encodeURIComponent(uid)}&limit=1`);
    const other = o.ok ? await o.json() : [];
    if (Array.isArray(other) && other.length) return res.status(409).json({ ok: false, error: "phonetaken" });

    const u = await sb(`phone_verifications?id=eq.${row.id}&used_at=is.null`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ used_at: now })
    });
    const burned = u.ok ? await u.json() : [];
    if (!Array.isArray(burned) || !burned.length) return res.status(400).json({ ok: false, error: "expired" });

    const p = await sb(`profiles?id=eq.${encodeURIComponent(uid)}&phone=eq.${encodeURIComponent(row.phone)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ phone_verified: true, phone_verified_at: now })
    });
    if (!p.ok) return res.status(500).json({ ok: false, error: "server" });
    return res.status(200).json({ ok: true, verified: true });
  } catch (e) {
    console.error("wa_verify error", e);
    return res.status(500).json({ ok: false, error: "server" });
  }
};
