// «السحب على الجوائز»: reads the shop's Facebook page posts / Instagram posts and their comments.
// Needs the Vercel environment variable META_PAGE_TOKEN (a Page access token, see README update 13).
const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const TOKEN = process.env.META_PAGE_TOKEN || "";
const G = "https://graph.facebook.com/v21.0/";

async function isAdmin(req) {
  const h = (req.headers && req.headers.authorization) || "";
  if (!h.startsWith("Bearer ") || !SB || !PK || !SK) return false;
  try {
    const r = await fetch(SB + "/auth/v1/user", { headers: { apikey: PK, Authorization: h } });
    if (!r.ok) return false;
    const u = await r.json();
    const r2 = await fetch(SB + "/rest/v1/profiles?select=role&id=eq." + u.id, { headers: { apikey: SK, Authorization: "Bearer " + SK } });
    const a = await r2.json();
    return Array.isArray(a) && a[0] && a[0].role === "admin";
  } catch (_) { return false; }
}

async function g(path, params) {
  const q = new URLSearchParams({ ...(params || {}), access_token: TOKEN });
  const r = await fetch(G + path + (path.includes("?") ? "&" : "?") + q.toString());
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) {
    const e = new Error((d.error && d.error.message) || "graph");
    e.code = (d.error && d.error.code) || r.status;
    throw e;
  }
  return d;
}

// follow "next" pages, up to a limit
async function all(path, params, max) {
  let out = [], d = await g(path, params), n = 0;
  while (d) {
    out = out.concat(d.data || []);
    const nx = d.paging && d.paging.next;
    if (!nx || out.length >= max || ++n > 60) break;
    const r = await fetch(nx);
    d = await r.json().catch(() => null);
    if (!d || d.error) break;
  }
  return out.slice(0, max);
}

const short = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") return res.status(200).json({ ok: true, ready: !!TOKEN });
    if (req.method !== "POST") return res.status(405).json({ ok: false });
    if (!(await isAdmin(req))) return res.status(403).json({ ok: false, error: "auth" });
    if (!TOKEN) return res.status(503).json({ ok: false, error: "token" });
    let b = req.body;
    try { if (typeof b === "string") b = JSON.parse(b); } catch (_) { b = {}; }
    b = b || {};

    if (b.action === "posts") {
      const me = await g("me", { fields: "id,name,instagram_business_account{id,username}" });
      const out = { page: { id: me.id, name: me.name }, ig: null, posts: [], errors: {} };
      try {
        const fb = await g(me.id + "/posts", { fields: "id,message,created_time,full_picture,permalink_url", limit: "15" });
        out.posts = out.posts.concat((fb.data || []).map(p => ({ src: "fb", id: p.id, text: short(p.message, 140), at: p.created_time, img: p.full_picture || null, url: p.permalink_url || null })));
      } catch (e) { out.errors.fb = e.message; }
      const ig = me.instagram_business_account;
      if (ig && ig.id) {
        out.ig = { id: ig.id, username: ig.username };
        try {
          const m = await g(ig.id + "/media", { fields: "id,caption,timestamp,media_type,media_url,thumbnail_url,permalink,comments_count", limit: "15" });
          out.posts = out.posts.concat((m.data || []).map(p => ({ src: "ig", id: p.id, text: short(p.caption, 140), at: p.timestamp, img: p.media_type === "VIDEO" ? p.thumbnail_url || null : p.media_url || null, url: p.permalink || null, count: p.comments_count })));
        } catch (e) { out.errors.ig = e.message; }
      } else out.errors.ig = "noig";
      out.posts.sort((a, c) => String(c.at).localeCompare(String(a.at)));
      return res.status(200).json({ ok: true, ...out });
    }

    if (b.action === "comments") {
      const id = String(b.id || "");
      if (!/^[0-9_]+$/.test(id)) return res.status(400).json({ ok: false, error: "bad" });
      let list = [];
      if (b.src === "ig") {
        const a = await all(id + "/comments", { fields: "id,text,username,timestamp,from{id,username}", limit: "50" }, 5000);
        list = a.map(c => {
          const user = c.username || (c.from && c.from.username) || "";
          const text = String(c.text || "");
          return { key: "ig:" + user.toLowerCase(), name: "@" + user, link: user ? "https://instagram.com/" + encodeURIComponent(user) : null, text: text.slice(0, 500), mentions: (text.match(/@[\w.]+/g) || []).length, at: c.timestamp };
        });
      } else {
        const a = await all(id + "/comments", { fields: "id,message,created_time,from{id,name},message_tags", filter: "stream", limit: "100" }, 5000);
        list = a.map(c => {
          const f = c.from || {};
          const tags = Array.isArray(c.message_tags) ? c.message_tags.filter(t => t && t.id !== f.id).length : 0;
          return { key: "fb:" + (f.id || f.name || c.id), name: f.name || "مستخدم فيسبوك", link: null, text: String(c.message || "").slice(0, 500), mentions: tags, at: c.created_time, page: f.id && b.page && f.id === b.page };
        }).filter(c => !c.page);
      }
      return res.status(200).json({ ok: true, comments: list });
    }
    return res.status(400).json({ ok: false, error: "action" });
  } catch (e) {
    console.error("draw error", (e && e.message) || e);
    return res.status(502).json({ ok: false, error: "graph", msg: String((e && e.message) || "").slice(0, 200) });
  }
};
