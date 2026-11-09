const crypto = require("crypto");
const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PK = process.env.SUPABASE_PUBLISHABLE_KEY;
const ORIGIN = process.env.PASSKEY_ORIGIN || "https://nutsworld.vercel.app";
const RPID = new URL(ORIGIN).hostname;
const b64u = b => Buffer.from(b).toString("base64url");
const hmac = s => crypto.createHmac("sha256", SK || "").update(s).digest("base64url");

// ---- stateless challenge: signed, single purpose, valid for 2 minutes ----
function mkChallenge(p, u) {
  const body = b64u(JSON.stringify({ p, u: u || "", t: Date.now(), n: crypto.randomBytes(8).toString("hex") }));
  return body + "." + hmac(body);
}
function chkChallenge(tok, p, u) {
  try {
    const [body, sig] = String(tok).split(".");
    if (!body || !sig) return false;
    const a = Buffer.from(sig), b = Buffer.from(hmac(body));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    const o = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const age = Date.now() - o.t;
    return o.p === p && (!u || o.u === u) && age >= 0 && age < 2 * 60 * 1000;
  } catch (_) { return false; }
}

// ---- minimal CBOR reader (enough for WebAuthn) ----
function cbor(buf, o = 0) {
  const ib = buf[o++], mt = ib >> 5, ai = ib & 31;
  const num = () => {
    if (ai < 24) return ai;
    if (ai === 24) { const x = buf[o]; o += 1; return x; }
    if (ai === 25) { const x = buf.readUInt16BE(o); o += 2; return x; }
    if (ai === 26) { const x = buf.readUInt32BE(o); o += 4; return x; }
    if (ai === 27) { const x = Number(buf.readBigUInt64BE(o)); o += 8; return x; }
    throw new Error("cbor");
  };
  if (mt === 0) return [num(), o];
  if (mt === 1) return [-1 - num(), o];
  if (mt === 2) { const n = num(); if (o + n > buf.length) throw new Error("cbor"); const v = buf.subarray(o, o + n); return [v, o + n]; }
  if (mt === 3) { const n = num(); if (o + n > buf.length) throw new Error("cbor"); const v = buf.subarray(o, o + n).toString("utf8"); return [v, o + n]; }
  if (mt === 4) { const n = num(), v = []; for (let i = 0; i < n; i++) { const r = cbor(buf, o); v.push(r[0]); o = r[1]; } return [v, o]; }
  if (mt === 5) { const n = num(), v = new Map(); for (let i = 0; i < n; i++) { const k = cbor(buf, o); const x = cbor(buf, k[1]); v.set(k[0], x[0]); o = x[1]; } return [v, o]; }
  if (mt === 7) { if (ai === 20) return [false, o]; if (ai === 21) return [true, o]; if (ai === 22 || ai === 23) return [null, o]; }
  throw new Error("cbor");
}

function parseAuth(buf) {
  if (buf.length < 37) throw new Error("auth");
  const out = { rpIdHash: buf.subarray(0, 32), flags: buf[32], counter: buf.readUInt32BE(33), att: null };
  if (out.flags & 0x40) {
    let off = 37 + 16;
    const len = buf.readUInt16BE(off); off += 2;
    const id = buf.subarray(off, off + len); off += len;
    const cose = cbor(buf, off)[0];
    out.att = { id, cose };
  }
  return out;
}

const rpHash = () => crypto.createHash("sha256").update(RPID).digest();
function checkAuth(a) {
  if (!crypto.timingSafeEqual(a.rpIdHash, rpHash())) throw new Error("rp");
  if (!(a.flags & 0x01) || !(a.flags & 0x04)) throw new Error("uv"); // user present and verified (fingerprint / face / PIN)
}
function checkClient(cdj, type, purpose, uid) {
  const cd = JSON.parse(cdj.toString("utf8"));
  if (cd.type !== type || cd.origin !== ORIGIN) throw new Error("origin");
  const tok = Buffer.from(String(cd.challenge || ""), "base64url").toString("utf8");
  if (!chkChallenge(tok, purpose, uid)) throw new Error("challenge");
}

function coseToJwk(m) {
  const kty = m.get(1), alg = m.get(3);
  if (kty === 2 && alg === -7 && m.get(-1) === 1) return { alg, jwk: { kty: "EC", crv: "P-256", x: b64u(m.get(-2)), y: b64u(m.get(-3)) } };
  if (kty === 3 && alg === -257) return { alg, jwk: { kty: "RSA", n: b64u(m.get(-1)), e: b64u(m.get(-2)) } };
  throw new Error("alg");
}

// ---- Supabase helpers ----
async function userFrom(req) {
  const h = (req.headers && req.headers.authorization) || "";
  if (!h.startsWith("Bearer ")) return null;
  try {
    const r = await fetch(SB + "/auth/v1/user", { headers: { apikey: PK, Authorization: h } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (_) { return null; }
}
const rest = (path, opt = {}) => fetch(SB + "/rest/v1/" + path, { ...opt, headers: { apikey: SK, "Content-Type": "application/json", ...(opt.headers || {}) } });

// After a valid biometric check, sign the user in on the server and hand back a normal session.
async function issueSession(uid) {
  const pr = await rest("profiles?select=email&id=eq." + uid);
  const email = pr.ok ? ((await pr.json())[0] || {}).email : null;
  if (!email) return null;
  const g = await fetch(SB + "/auth/v1/admin/generate_link", { method: "POST", headers: { apikey: SK, "Content-Type": "application/json" }, body: JSON.stringify({ type: "magiclink", email }) });
  const gd = await g.json().catch(() => ({}));
  const th = gd.hashed_token || (gd.properties && gd.properties.hashed_token);
  if (!g.ok || !th) { console.error("generate_link failed", g.status, JSON.stringify(gd).slice(0, 200)); return null; }
  for (const type of ["magiclink", "email"]) {
    const v = await fetch(SB + "/auth/v1/verify", { method: "POST", headers: { apikey: PK, "Content-Type": "application/json" }, body: JSON.stringify({ type, token_hash: th }) });
    const vd = await v.json().catch(() => ({}));
    if (v.ok && vd.access_token) return { access_token: vd.access_token, refresh_token: vd.refresh_token, expires_in: vd.expires_in, user: { id: uid } };
    console.error("verify failed", type, v.status, JSON.stringify(vd).slice(0, 200));
  }
  return null;
}

async function main(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!SB || !SK || !PK) return res.status(500).json({ ok: false, error: "server" });
  let b = req.body;
  try { if (typeof b === "string") b = JSON.parse(b); } catch (_) { b = {}; }
  b = b || {};
  const a = String(b.a || "");

  if (a === "login-options") {
    const cid = String(b.cid || "").slice(0, 400);
    return res.status(200).json({ ok: true, challenge: mkChallenge("login", ""), rpId: RPID, allowCredentials: cid ? [{ id: cid }] : [] });
  }

  if (a === "login-verify") {
    try {
      const r = b.response || {};
      const cdj = Buffer.from(String(r.clientDataJSON), "base64url");
      const authData = Buffer.from(String(r.authenticatorData), "base64url");
      const sig = Buffer.from(String(r.signature), "base64url");
      checkClient(cdj, "webauthn.get", "login", "");
      const au = parseAuth(authData);
      checkAuth(au);
      const cid = String(b.id || "");
      const pr = await rest("passkeys?select=id,user_id,public_key,counter&credential_id=eq." + encodeURIComponent(cid));
      const row = pr.ok ? (await pr.json())[0] : null;
      if (!row) return res.status(401).json({ ok: false, error: "unknown" });
      const key = crypto.createPublicKey({ key: row.public_key, format: "jwk" });
      const data = Buffer.concat([authData, crypto.createHash("sha256").update(cdj).digest()]);
      if (!crypto.verify("sha256", data, key, sig)) return res.status(401).json({ ok: false, error: "sig" });
      if ((au.counter > 0 || Number(row.counter) > 0) && au.counter <= Number(row.counter)) return res.status(401).json({ ok: false, error: "replay" });
      const s = await issueSession(row.user_id);
      if (!s) return res.status(500).json({ ok: false, error: "session" });
      rest("passkeys?id=eq." + row.id, { method: "PATCH", body: JSON.stringify({ counter: au.counter, last_used_at: new Date().toISOString() }) }).catch(() => {});
      return res.status(200).json({ ok: true, ...s });
    } catch (e) {
      console.error("passkey login error", (e && e.message) || e);
      return res.status(401).json({ ok: false, error: "invalid" });
    }
  }

  // everything below needs a signed-in user
  const user = await userFrom(req);
  if (!user) return res.status(401).json({ ok: false, error: "auth" });

  if (a === "reg-options") {
    const ex = await rest("passkeys?select=credential_id&user_id=eq." + user.id);
    const ids = ex.ok ? (await ex.json()).map(x => ({ id: x.credential_id })) : [];
    return res.status(200).json({
      ok: true,
      challenge: mkChallenge("reg", user.id),
      rp: { id: RPID, name: "عالم المكسرات" },
      user: { id: b64u(Buffer.from(user.id.replace(/-/g, ""), "hex")), name: user.email || user.id, displayName: String((user.user_metadata && user.user_metadata.full_name) || user.email || "عميل").slice(0, 60) },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      excludeCredentials: ids
    });
  }

  if (a === "reg-verify") {
    try {
      const r = b.response || {};
      const cdj = Buffer.from(String(r.clientDataJSON), "base64url");
      checkClient(cdj, "webauthn.create", "reg", user.id);
      const att = cbor(Buffer.from(String(r.attestationObject), "base64url"))[0];
      const au = parseAuth(att.get("authData"));
      checkAuth(au);
      if (!au.att) throw new Error("noattested");
      const { alg, jwk } = coseToJwk(au.att.cose);
      const cid = b64u(au.att.id);
      const ins = await rest("passkeys", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ user_id: user.id, credential_id: cid, public_key: jwk, alg, counter: au.counter, device_name: String(b.name || "").slice(0, 60) }) });
      if (!ins.ok) { console.error("passkey insert failed", ins.status, (await ins.text()).slice(0, 200)); return res.status(409).json({ ok: false, error: "exists" }); }
      return res.status(200).json({ ok: true, credentialId: cid });
    } catch (e) {
      console.error("passkey register error", (e && e.message) || e);
      return res.status(400).json({ ok: false, error: "invalid" });
    }
  }

  if (a === "remove") {
    const cid = String(b.cid || "");
    if (!cid) return res.status(400).json({ ok: false, error: "bad" });
    const d = await rest("passkeys?credential_id=eq." + encodeURIComponent(cid) + "&user_id=eq." + user.id, { method: "DELETE" });
    return res.status(d.ok ? 200 : 500).json({ ok: d.ok });
  }

  return res.status(400).json({ ok: false, error: "bad" });
}

module.exports = async (req, res) => {
  try { return await main(req, res); }
  catch (e) { console.error("passkey error", (e && e.stack) || e); return res.status(500).json({ ok: false, error: "server" }); }
};
module.exports._t = { cbor, parseAuth, mkChallenge, chkChallenge, coseToJwk };
