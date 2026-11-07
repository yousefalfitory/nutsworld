module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  const { TELEGRAM_TOKEN: token, TELEGRAM_CHAT_ID: chat } = process.env;
  if (!token || !chat) return res.status(500).json({ ok: false });
  let b = req.body;
  try { if (typeof b === "string") b = JSON.parse(b); } catch (_) { b = {}; }
  b = b || {};
  const s = (v, n = 200) => String(v == null ? "" : v).slice(0, n);
  const items = Array.isArray(b.items) ? b.items.slice(0, 60) : [];
  if (!items.length || !s(b.name) || !s(b.phone)) return res.status(400).json({ ok: false });
  const text = [
    "🛒 طلب جديد - عالم المكسرات",
    ...items.map(i => `- ${s(i.name, 60)}: ${s(i.qty, 20)} = ${s(i.sum, 20)} د.ل`),
    `المجموع: ${s(b.total, 20)} د.ل (بدون التوصيل)`,
    `الاسم: ${s(b.name, 80)}`,
    `الهاتف: ${s(b.phone, 30)}`,
    `المدينة: ${s(b.city, 60)}`,
    `العنوان: ${s(b.address, 200)}`,
    "الدفع: عند الاستلام"
  ].join("\n");
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text })
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  } catch (_) {
    return res.status(502).json({ ok: false });
  }
};
