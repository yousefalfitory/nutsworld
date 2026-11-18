// Checks the 6-digit code a signed-in customer typed; on success the account's phone becomes verified.
const OTP = require("./_otp");
const SB = process.env.SUPABASE_URL;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;

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

module.exports = async (req, res, body) => {
  const uid = await userId(req);
  if (!uid) return res.status(401).json({ ok: false, error: "auth" });
  try {
    const c = await OTP.check(uid, body && body.code);
    if (!c.ok) return res.status(c.status).json(c.body);
    const m = await OTP.markVerified(uid, c.row.phone);
    if (m === "taken") return res.status(409).json({ ok: false, error: "phonetaken" });
    if (m !== "ok") return res.status(500).json({ ok: false, error: "server" });
    return res.status(200).json({ ok: true, verified: true });
  } catch (e) {
    console.error("wa_verify error", e);
    return res.status(500).json({ ok: false, error: "server" });
  }
};
module.exports.userId = userId;
