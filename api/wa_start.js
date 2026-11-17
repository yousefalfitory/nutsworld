// Starts a phone verification: the shop sends a 6-digit code to the customer's WhatsApp
// (approved template "nw_otp", Arabic, copy-code button). The customer types it in the site (the same /api/wa_start, with {code}).
const crypto = require("crypto");

const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const TOKEN = process.env.WA_TOKEN;
const PHONE_ID = String(process.env.WA_PHONE_ID || "").replace(/\D/g, "");
const TEMPLATE = process.env.WA_OTP_TEMPLATE || "nw_otp";
const LANG = process.env.WA_OTP_LANG || "ar";
const TTL_MIN = 5;
const MAX_PER_HOUR = 5;
const GAP_SEC = 60;

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

async function sendCode(to, code) {
  const r = await fetch("https://graph.facebook.com/v23.0/" + PHONE_ID + "/messages", {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: TEMPLATE,
        language: { code: LANG },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] }
        ]
      }
    })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) console.error("wa send failed", r.status, JSON.stringify(d && d.error || d).slice(0, 400));
  return { ok: r.ok, err: d && d.error };
}

const checkCode = require("./_wa_verify");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  // the same address also checks the code the customer typed (Hobby plan: max 12 functions)
  let body = req.body;
  try { if (typeof body === "string") body = JSON.parse(body); } catch (_) { body = {}; }
  if (body && body.code) return checkCode(req, res);
  if (!SB || !SK || !PK || !TOKEN || !PHONE_ID) return res.status(500).json({ ok: false, error: "config" });

  const uid = await userId(req);
  if (!uid) return res.status(401).json({ ok: false, error: "auth" });

  try {
    const pr = await sb(`profiles?select=phone,phone_verified&id=eq.${encodeURIComponent(uid)}&limit=1`);
    const p = pr.ok ? (await pr.json())[0] : null;
    if (!p || !/^\d{8,15}$/.test(String(p.phone || ""))) return res.status(400).json({ ok: false, error: "phone" });
    if (p.phone_verified) return res.status(200).json({ ok: true, verified: true });

    const since = new Date(Date.now() - 3600e3).toISOString();
    const cr = await sb(`phone_verifications?select=id,created_at&user_id=eq.${encodeURIComponent(uid)}&created_at=gt.${encodeURIComponent(since)}&order=created_at.desc`);
    const recent = cr.ok ? await cr.json() : [];
    if (Array.isArray(recent) && recent.length >= MAX_PER_HOUR) return res.status(429).json({ ok: false, error: "rate" });
    if (Array.isArray(recent) && recent[0]) {
      const wait = GAP_SEC - Math.floor((Date.now() - new Date(recent[0].created_at).getTime()) / 1000);
      if (wait > 0) return res.status(429).json({ ok: false, error: "wait", wait });
    }

    // only the newest code stays valid (old ones are burned, not deleted, so they still count for the hourly limit)
    await sb(`phone_verifications?user_id=eq.${encodeURIComponent(uid)}&used_at=is.null`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ used_at: new Date().toISOString() })
    });

    const code = String(crypto.randomInt(100000, 1000000));
    const ir = await sb("phone_verifications", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ user_id: uid, phone: p.phone, code, expires_at: new Date(Date.now() + TTL_MIN * 60e3).toISOString() })
    });
    if (!ir.ok) return res.status(500).json({ ok: false, error: "server" });

    const s = await sendCode(p.phone, code);
    if (!s.ok) {
      const c = s.err && s.err.code;
      // 131026 / 131030 / 133010: the number can't receive WhatsApp messages
      return res.status(502).json({ ok: false, error: c === 131026 || c === 131030 || c === 133010 ? "nowa" : "send" });
    }
    return res.status(200).json({ ok: true, sent: true, expires_in: TTL_MIN * 60, gap: GAP_SEC });
  } catch (e) {
    console.error("wa_start error", e);
    return res.status(500).json({ ok: false, error: "server" });
  }
};
