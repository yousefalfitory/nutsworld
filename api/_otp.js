// Shared by phone verification and «forgot password»: makes a 6-digit code for an account
// and sends it to that account's WhatsApp with the approved template "nw_otp".
const crypto = require("crypto");

const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const TOKEN = process.env.WA_TOKEN;
const PHONE_ID = String(process.env.WA_PHONE_ID || "").replace(/\D/g, "");
const TEMPLATE = process.env.WA_OTP_TEMPLATE || "nw_otp";
const LANG = process.env.WA_OTP_LANG || "ar";
const TTL_MIN = 5;
const MAX_PER_HOUR = 5;
const GAP_SEC = TTL_MIN * 60; // a new code only after the previous one has expired
const MAX_TRIES = 5;

const ready = () => !!(SB && SK && TOKEN && PHONE_ID);

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
  if (!r.ok) console.error("wa send failed", r.status, JSON.stringify((d && d.error) || d).slice(0, 400));
  return { ok: r.ok, err: d && d.error };
}

// returns { status, body } ready for res.status(status).json(body)
async function issue(uid, phone) {
  const since = new Date(Date.now() - 3600e3).toISOString();
  const cr = await sb(`phone_verifications?select=id,created_at&user_id=eq.${encodeURIComponent(uid)}&created_at=gt.${encodeURIComponent(since)}&order=created_at.desc`);
  const recent = cr.ok ? await cr.json() : [];
  if (Array.isArray(recent) && recent.length >= MAX_PER_HOUR) return { status: 429, body: { ok: false, error: "rate" } };
  if (Array.isArray(recent) && recent[0]) {
    const wait = GAP_SEC - Math.floor((Date.now() - new Date(recent[0].created_at).getTime()) / 1000);
    if (wait > 0) return { status: 429, body: { ok: false, error: "wait", wait } };
  }
  // only the newest code stays valid (old ones are burned, not deleted, so they still count for the hourly limit)
  await sb(`phone_verifications?user_id=eq.${encodeURIComponent(uid)}&used_at=is.null`, {
    method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ used_at: new Date().toISOString() })
  });
  const code = String(crypto.randomInt(100000, 1000000));
  const ir = await sb("phone_verifications", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: uid, phone, code, expires_at: new Date(Date.now() + TTL_MIN * 60e3).toISOString() })
  });
  if (!ir.ok) return { status: 500, body: { ok: false, error: "server" } };
  const s = await sendCode(phone, code);
  if (!s.ok) {
    const c = s.err && s.err.code;
    // 131026 / 131030 / 133010: the number can't receive WhatsApp messages
    return { status: 502, body: { ok: false, error: c === 131026 || c === 131030 || c === 133010 ? "nowa" : "send" } };
  }
  return { status: 200, body: { ok: true, sent: true, expires_in: TTL_MIN * 60, gap: GAP_SEC } };
}

// checks a typed code against the newest open one; 5 wrong tries burn it. Returns { ok, row } or { status, body }
async function check(uid, typed) {
  const code = String(typed || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(code)) return { status: 400, body: { ok: false, error: "code" } };
  const now = new Date().toISOString();
  const r = await sb(`phone_verifications?select=id,phone,code,tries&user_id=eq.${encodeURIComponent(uid)}&used_at=is.null&expires_at=gt.${encodeURIComponent(now)}&order=created_at.desc&limit=1`);
  const row = r.ok ? (await r.json())[0] : null;
  if (!row) return { status: 400, body: { ok: false, error: "expired" } };
  if (row.code !== code) {
    const tries = (row.tries || 0) + 1;
    await sb(`phone_verifications?id=eq.${row.id}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify(tries >= MAX_TRIES ? { tries, used_at: now } : { tries })
    });
    return { status: 400, body: { ok: false, error: tries >= MAX_TRIES ? "expired" : "wrong", left: Math.max(0, MAX_TRIES - tries) } };
  }
  const u = await sb(`phone_verifications?id=eq.${row.id}&used_at=is.null`, {
    method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ used_at: now })
  });
  const burned = u.ok ? await u.json() : [];
  if (!Array.isArray(burned) || !burned.length) return { status: 400, body: { ok: false, error: "expired" } };
  return { ok: true, row };
}

// marks the phone as verified unless another account already holds it verified
async function markVerified(uid, phone) {
  const o = await sb(`profiles?select=id&phone=eq.${encodeURIComponent(phone)}&phone_verified=is.true&id=neq.${encodeURIComponent(uid)}&limit=1`);
  const other = o.ok ? await o.json() : [];
  if (Array.isArray(other) && other.length) return "taken";
  const p = await sb(`profiles?id=eq.${encodeURIComponent(uid)}&phone=eq.${encodeURIComponent(phone)}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ phone_verified: true, phone_verified_at: new Date().toISOString() })
  });
  return p.ok ? "ok" : "error";
}

module.exports = { ready, sb, issue, check, markVerified };
