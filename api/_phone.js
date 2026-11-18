// Finds the account behind what someone typed: a Libyan number (091… / 91… / 218…),
// a full number with + / 00, or a foreign number written the local way (010…).
const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;

const norm = p => {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "218" + d.slice(1);
  else if (/^9\d{8}$/.test(d)) d = "218" + d;
  return d;
};

async function findByPhone(typed) {
  const sel = "/rest/v1/profiles?select=id,email,phone,phone_verified&order=phone_verified.desc,created_at.asc";
  const ph = norm(typed);
  if (/^\d{8,15}$/.test(ph)) {
    const r = await fetch(SB + sel + "&limit=1&phone=eq." + encodeURIComponent(ph), { headers: { apikey: SK } });
    const a = r.ok ? await r.json() : [];
    if (Array.isArray(a) && a[0]) return a[0];
  }
  const local = String(typed || "").replace(/\D/g, "").replace(/^0+/, "");
  if (/^\d{7,13}$/.test(local) && !/^\+|^00/.test(String(typed || "").trim())) {
    const r = await fetch(SB + sel + "&limit=5&phone=like.*" + encodeURIComponent(local), { headers: { apikey: SK } });
    let a = r.ok ? await r.json() : [];
    // what is in front of it must be a country code (1–3 digits)
    a = (Array.isArray(a) ? a : []).filter(x => /^\d{1,3}$/.test(String(x.phone || "").slice(0, -local.length)));
    if (new Set(a.map(x => x.phone)).size === 1) return a[0];
  }
  return null;
}

module.exports = { norm, findByPhone };
