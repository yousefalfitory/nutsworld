// WhatsApp codes (one address, because the Hobby plan allows max 12 functions):
//  {}                                   signed in: send a code to verify my phone
//  {code}                               signed in: check that code
//  {action:"reset_send", phone}         forgot password: send a code to that account's WhatsApp
//  {action:"reset_done", phone, code, password}   forgot password: set the new password and sign in
const OTP = require("./_otp");
const verify = require("./_wa_verify");
const reset = require("./_reset");
const SB = process.env.SUPABASE_URL;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!OTP.ready() || !PK) return res.status(500).json({ ok: false, error: "config" });
  let b = req.body;
  try { if (typeof b === "string") b = JSON.parse(b); } catch (_) { b = {}; }
  b = b || {};

  if (b.action === "reset_send" || b.action === "reset_done") return reset(req, res, b);
  if (b.code) return verify(req, res, b);

  const uid = await verify.userId(req);
  if (!uid) return res.status(401).json({ ok: false, error: "auth" });
  try {
    const pr = await OTP.sb(`profiles?select=phone,phone_verified&id=eq.${encodeURIComponent(uid)}&limit=1`);
    const p = pr.ok ? (await pr.json())[0] : null;
    if (!p || !/^\d{8,15}$/.test(String(p.phone || ""))) return res.status(400).json({ ok: false, error: "phone" });
    if (p.phone_verified) return res.status(200).json({ ok: true, verified: true });
    const r = await OTP.issue(uid, p.phone);
    return res.status(r.status).json(r.body);
  } catch (e) {
    console.error("wa_start error", e);
    return res.status(500).json({ ok: false, error: "server" });
  }
};
