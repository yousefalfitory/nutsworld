const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;


const register = require("./_register");
const { findByPhone } = require("./_phone");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  let b = req.body;
  try { if (typeof b === "string") b = JSON.parse(b); } catch (_) { b = {}; }
  b = b || {};
  // sign-up without email goes through here too (Hobby plan: max 12 functions)
  if (b.action === "register") { req.body = b; return register(req, res); }
  const login = String(b.login || "").trim().slice(0, 120);
  const password = String(b.password || "").slice(0, 200);
  if (!login || !password || !SB || !SK || !PK) return res.status(400).json({ error: "bad" });
  try {
    let email = login.includes("@") ? login.toLowerCase() : null;
    if (!email) {
      const p = await findByPhone(login);
      email = p && p.email;
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
