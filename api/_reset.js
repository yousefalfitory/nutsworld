// «Forgot password» over WhatsApp: the code goes to the number on the account,
// then the code + a new password sign the customer straight in.
const OTP = require("./_otp");
const { findByPhone } = require("./_phone");
const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const pwOK = p => p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p);
const mask = p => "…" + String(p || "").slice(-3);

module.exports = async (req, res, b) => {
  try {
    const typed = String(b.phone || "").trim().slice(0, 30);
    if (!typed || typed.includes("@")) return res.status(400).json({ ok: false, error: "phone" });
    const p = await findByPhone(typed);
    if (!p || !/^\d{8,15}$/.test(String(p.phone || ""))) return res.status(404).json({ ok: false, error: "nouser" });

    if (b.action === "reset_send") {
      const r = await OTP.issue(p.id, p.phone);
      if (r.status === 200) r.body.to = mask(p.phone);
      return res.status(r.status).json(r.body);
    }

    // reset_done
    const password = String(b.password || "").slice(0, 200);
    if (!pwOK(password)) return res.status(400).json({ ok: false, error: "weak" });
    const c = await OTP.check(p.id, b.code);
    if (!c.ok) return res.status(c.status).json(c.body);

    const u = await fetch(SB + "/auth/v1/admin/users/" + p.id, {
      method: "PUT",
      headers: { apikey: SK, Authorization: "Bearer " + SK, "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    if (!u.ok) { console.error("reset pw failed", u.status, (await u.text()).slice(0, 200)); return res.status(500).json({ ok: false, error: "server" }); }
    if (!p.phone_verified) await OTP.markVerified(p.id, p.phone).catch(() => {});

    const t = await fetch(SB + "/auth/v1/token?grant_type=password", {
      method: "POST", headers: { apikey: PK, "Content-Type": "application/json" },
      body: JSON.stringify({ email: p.email, password })
    });
    const d = await t.json().catch(() => ({}));
    if (!t.ok || !d.access_token) return res.status(200).json({ ok: true, changed: true });
    return res.status(200).json({ ok: true, changed: true, access_token: d.access_token, refresh_token: d.refresh_token, expires_in: d.expires_in, user: { id: d.user && d.user.id } });
  } catch (e) {
    console.error("reset error", e);
    return res.status(500).json({ ok: false, error: "server" });
  }
};
