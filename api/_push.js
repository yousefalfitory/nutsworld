// Web Push without extra packages: VAPID signing (RFC 8292) + aes128gcm encryption (RFC 8291).
// Needs two Vercel environment variables: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (see README, update 13).
const crypto = require("crypto");

const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_SECRET_KEY;
const PUB = process.env.VAPID_PUBLIC_KEY || "";
const PRIV = process.env.VAPID_PRIVATE_KEY || "";
const SUBJ = process.env.VAPID_SUBJECT || "mailto:yalfitory@gmail.com";

const b64u = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64");
const ready = () => !!(PUB && PRIV && SB && SK);

function vapidJwt(aud) {
  const pub = unb64u(PUB);
  const key = crypto.createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: PRIV, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    format: "jwk"
  });
  const head = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const body = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJ }));
  const sig = crypto.sign("sha256", Buffer.from(head + "." + body), { key, dsaEncoding: "ieee-p1363" });
  return head + "." + body + "." + b64u(sig);
}

const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();

function encrypt(sub, text) {
  const uaPub = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const ecdh = crypto.createECDH("prime256v1");
  const asPub = ecdh.generateKeys();
  const secret = ecdh.computeSecret(uaPub);
  const ikm = hmac(hmac(auth, secret), Buffer.concat([Buffer.from("WebPush: info\0"), uaPub, asPub, Buffer.from([1])]));
  const salt = crypto.randomBytes(16);
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01", "binary")).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01", "binary")).subarray(0, 12);
  const c = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const enc = Buffer.concat([c.update(Buffer.concat([Buffer.from(text), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const head = Buffer.alloc(21);
  salt.copy(head, 0);
  head.writeUInt32BE(4096, 16);
  head.writeUInt8(65, 20);
  return Buffer.concat([head, asPub, enc]);
}

// Sends one notification. Returns "ok", "gone" (subscription expired: delete it) or "fail".
async function sendOne(sub, payload) {
  try {
    const u = new URL(sub.endpoint);
    const r = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "high",
        Authorization: "vapid t=" + vapidJwt(u.protocol + "//" + u.host) + ", k=" + PUB
      },
      body: encrypt(sub, JSON.stringify(payload))
    });
    if (r.status === 404 || r.status === 410) return "gone";
    return r.ok ? "ok" : "fail";
  } catch (_) { return "fail"; }
}

const H = () => ({ apikey: SK, "Content-Type": "application/json" });

// Sends to every saved device that matches the filter (a PostgREST query string, e.g. "role=in.(staff,admin)").
async function sendTo(filter, payload) {
  if (!ready()) return 0;
  let rows = [];
  try {
    const r = await fetch(SB + "/rest/v1/push_subs?select=endpoint,sub&" + filter, { headers: H() });
    rows = await r.json();
    if (!Array.isArray(rows)) return 0;
  } catch (_) { return 0; }
  const res = await Promise.all(rows.map((x) => Promise.race([sendOne(x.sub, payload), new Promise((ok) => setTimeout(() => ok("fail"), 6000))])));
  const gone = rows.filter((x, i) => res[i] === "gone").map((x) => x.endpoint);
  if (gone.length) {
    try {
      await fetch(SB + "/rest/v1/push_subs?endpoint=in.(" + gone.map((e) => '"' + e.replace(/"/g, "") + '"').join(",") + ")", { method: "DELETE", headers: H() });
    } catch (_) {}
  }
  return res.filter((x) => x === "ok").length;
}

module.exports = { ready, sendTo, sendOne, PUB: () => PUB };
