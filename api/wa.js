// WhatsApp Cloud API webhook.
// A customer sends us the code (NW-xxxxxx) from THEIR phone; WhatsApp tells us the sender's number,
// so if the code and the number both match, that phone number is proven to belong to the customer.
// We never send anything back, so this costs nothing.
const crypto = require("crypto");

const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const VERIFY = process.env.WA_VERIFY_TOKEN;
const SECRET = process.env.WA_APP_SECRET;

const sb = (path, opt = {}) =>
  fetch(SB + "/rest/v1/" + path, {
    ...opt,
    headers: { apikey: SK, "Content-Type": "application/json", ...(opt.headers || {}) }
  });

async function raw(req) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  const chunks = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

function signedOk(buf, header) {
  if (!SECRET || !header) return false;
  const want = "sha256=" + crypto.createHmac("sha256", SECRET).update(buf).digest("hex");
  const a = Buffer.from(want), b = Buffer.from(String(header));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handle(from, body) {
  const m = /NW[\s-]?(\d{6})/i.exec(body || "");
  if (!m || !/^\d{8,15}$/.test(from)) return false;
  const code = "NW-" + m[1];
  const now = new Date().toISOString();

  const r = await sb(
    `phone_verifications?select=id,user_id,phone&code=eq.${encodeURIComponent(code)}&used_at=is.null&expires_at=gt.${encodeURIComponent(now)}&limit=5`
  );
  const rows = r.ok ? await r.json() : [];
  const hit = Array.isArray(rows) ? rows.find(x => x.phone === from) : null;
  if (!hit) return false;

  // burn the code first (one use only), then mark the phone as verified
  const u = await sb(`phone_verifications?id=eq.${hit.id}&used_at=is.null`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ used_at: now })
  });
  const burned = u.ok ? await u.json() : [];
  if (!Array.isArray(burned) || !burned.length) return false;

  const p = await sb(`profiles?id=eq.${encodeURIComponent(hit.user_id)}&phone=eq.${encodeURIComponent(from)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ phone_verified: true, phone_verified_at: now })
  });
  return p.ok;
}

module.exports = async (req, res) => {
  // Meta's one-time handshake when you save the webhook URL
  if (req.method === "GET") {
    const q = req.query || {};
    if (q["hub.mode"] === "subscribe") {
      if (VERIFY && q["hub.verify_token"] === VERIFY) return res.status(200).send(String(q["hub.challenge"] || ""));
      return res.status(403).send("forbidden");
    }
    return res.status(200).json({ ok: true, ready: !!(SB && SK && VERIFY && SECRET) });
  }
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!SB || !SK || !SECRET) return res.status(500).json({ ok: false });

  const buf = await raw(req);
  if (!signedOk(buf, req.headers && req.headers["x-hub-signature-256"])) return res.status(401).json({ ok: false });

  let b = {};
  try { b = JSON.parse(buf.toString("utf8")); } catch (_) { return res.status(200).json({ ok: true }); }

  try {
    for (const e of b.entry || [])
      for (const c of e.changes || [])
        for (const m of (c.value && c.value.messages) || [])
          if (m && m.type === "text" && m.text) await handle(String(m.from || ""), String(m.text.body || ""));
  } catch (err) {
    console.error("wa webhook error", err);
  }
  return res.status(200).json({ ok: true });
};

module.exports.config = { api: { bodyParser: false } };
