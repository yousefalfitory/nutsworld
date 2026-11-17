// New account without an email: the phone number is the login, and WhatsApp proves it.
// The account gets a hidden address <phone>@phone.nutsworld.ly that nobody ever sees or uses.
// Also answers {check:true, phone} so the email sign-up can refuse a number that is already verified.
const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const DOM = "phone.nutsworld.ly";

const norm = p => {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "218" + d.slice(1);
  else if (/^9\d{8}$/.test(d)) d = "218" + d;
  return d;
};
const pwOK = p => p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p);
const admin = { apikey: SK, Authorization: "Bearer " + SK, "Content-Type": "application/json" };

async function profilesByPhone(ph) {
  const r = await fetch(SB + "/rest/v1/profiles?select=id,email,phone_verified&phone=eq." + encodeURIComponent(ph), { headers: { apikey: SK } });
  const a = r.ok ? await r.json() : [];
  return Array.isArray(a) ? a : [];
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  if (!SB || !SK || !PK) return res.status(500).json({ error: "config" });
  let b = req.body;
  try { if (typeof b === "string") b = JSON.parse(b); } catch (_) { b = {}; }
  b = b || {};
  const ph = norm(b.phone);
  if (!/^\d{8,15}$/.test(ph)) return res.status(400).json({ error: "phone" });

  try {
    const same = await profilesByPhone(ph);
    if (same.some(x => x.phone_verified)) return res.status(409).json({ error: "phonetaken" });
    if (b.check) return res.status(200).json({ ok: true });

    const name = String(b.name || "").trim().slice(0, 80);
    const password = String(b.password || "").slice(0, 200);
    if (name.length < 2) return res.status(400).json({ error: "name" });
    if (!pwOK(password)) return res.status(400).json({ error: "weak" });

    // an earlier, never-verified sign-up with this number (made by anyone) is removed, so the real owner can register
    const email = ph + "@" + DOM;
    for (const x of same) {
      if (!x.phone_verified && String(x.email || "").toLowerCase() === email) {
        await fetch(SB + "/auth/v1/admin/users/" + x.id, { method: "DELETE", headers: admin }).catch(() => {});
      }
    }

    const c = await fetch(SB + "/auth/v1/admin/users", {
      method: "POST",
      headers: admin,
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: name, phone: ph } })
    });
    if (!c.ok) {
      const t = await c.text();
      console.error("register create failed", c.status, t);
      return res.status(/already|exists|registered/i.test(t) ? 409 : 500).json({ error: /already|exists|registered/i.test(t) ? "exists" : "server" });
    }

    const s = await fetch(SB + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: PK, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const d = await s.json();
    if (!s.ok || !d.access_token) return res.status(500).json({ error: "server" });
    return res.status(200).json({
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_in: d.expires_in,
      user: { id: d.user && d.user.id }
    });
  } catch (e) {
    console.error("register error", e);
    return res.status(500).json({ error: "server" });
  }
};
