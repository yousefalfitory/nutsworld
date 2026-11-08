const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;

const norm = p => {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "218" + d.slice(1);
  else if (/^9\d{8}$/.test(d)) d = "218" + d;
  return d;
};

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  let b = req.body;
  try { if (typeof b === "string") b = JSON.parse(b); } catch (_) { b = {}; }
  b = b || {};
  const login = String(b.login || "").trim().slice(0, 120);
  const password = String(b.password || "").slice(0, 200);
  if (!login || !password || !SB || !SK || !PK) return res.status(400).json({ error: "bad" });
  try {
    let email = login.includes("@") ? login.toLowerCase() : null;
    if (!email) {
      const ph = norm(login);
      const r = await fetch(SB + "/rest/v1/profiles?select=email&limit=1&phone=eq." + encodeURIComponent(ph), { headers: { apikey: SK } });
      const a = r.ok ? await r.json() : [];
      email = a[0] && a[0].email;
    }
    if (!email) return res.status(401).json({ error: "invalid" });
    const t = await fetch(SB + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: PK, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const d = await t.json();
    if (!t.ok || !d.access_token) {
      return res.status(401).json({ error: d && d.error_code === "email_not_confirmed" ? "unconfirmed" : "invalid" });
    }
    return res.status(200).json({
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_in: d.expires_in,
      user: { id: d.user && d.user.id }
    });
  } catch (_) {
    return res.status(500).json({ error: "server" });
  }
};
