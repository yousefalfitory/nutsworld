// The customer deletes his own account (needs setup_10.sql).
// Refused while the wallet has money or a top-up is waiting.
const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;

async function rpc(fn, args) {
  const r = await fetch(SB + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: { apikey: SK, "Content-Type": "application/json" },
    body: JSON.stringify(args)
  });
  const d = await r.json().catch(() => null);
  return { ok: r.ok, data: d };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const auth = (req.headers && req.headers.authorization) || "";
  if (!auth.startsWith("Bearer ") || !SB || !PK || !SK) return res.status(401).json({ ok: false, error: "auth" });
  try {
    const u = await fetch(SB + "/auth/v1/user", { headers: { apikey: PK, Authorization: auth } });
    if (!u.ok) return res.status(401).json({ ok: false, error: "auth" });
    const user = await u.json();
    if (!user || !user.id) return res.status(401).json({ ok: false, error: "auth" });

    const chk = await rpc("account_can_delete", { p_user: user.id });
    if (!chk.ok) { console.error("can_delete failed", JSON.stringify(chk.data)); return res.status(500).json({ ok: false, error: "server" }); }
    if (chk.data === "balance") return res.status(409).json({ ok: false, error: "balance" });
    if (chk.data === "staff") return res.status(403).json({ ok: false, error: "staff" });
    if (chk.data !== "ok") return res.status(404).json({ ok: false, error: "nouser" });

    // remove the profile photo (best effort)
    try {
      await fetch(SB + "/storage/v1/object/avatars", {
        method: "DELETE",
        headers: { apikey: SK, Authorization: "Bearer " + SK, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: [user.id + "/avatar.jpg"] })
      });
    } catch (_) {}

    // 1st way: Supabase Auth admin. 2nd way (backup): the SQL function.
    let done = false;
    try {
      const d = await fetch(SB + "/auth/v1/admin/users/" + user.id, { method: "DELETE", headers: { apikey: SK, Authorization: "Bearer " + SK } });
      done = d.ok;
      if (!done) console.error("auth admin delete failed", d.status, await d.text());
    } catch (e) { console.error("auth admin delete error", e); }
    if (!done) {
      const b = await rpc("account_delete_sql", { p_user: user.id });
      done = b.ok;
      if (!done) console.error("sql delete failed", JSON.stringify(b.data));
    }
    if (!done) return res.status(500).json({ ok: false, error: "server" });

    const { TELEGRAM_TOKEN: token, TELEGRAM_CHAT_ID: chat } = process.env;
    if (token && chat) {
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chat, text: "🗑️ زبون حذف حسابه من المتجر\nالإيميل: " + (user.email || "") })
        });
      } catch (_) {}
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("account error", (e && e.stack) || e);
    return res.status(500).json({ ok: false, error: "server" });
  }
};
