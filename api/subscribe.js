/**
 * Waitlist subscribe endpoint (gethumans.app).
 *
 * WEB-1 rewrite. The previous version required a `captcha` field that the
 * form never sent, so every real submission got a 400 and production
 * captured nothing. This version drops the broken reCAPTCHA dependency and
 * uses two cheap, key-less defences that are enough for V1 waitlist volume:
 *
 *   1. Honeypot — a hidden `hp` text field. Real users never fill it;
 *      naive bots fill every input. If it has a value we 200-OK and drop.
 *   2. Best-effort rate limit — per client IP, in-memory. This is
 *      per-lambda-instance (not global) so it only blunts bursts from one
 *      source; a stricter limit would need Vercel KV / Upstash (external,
 *      not set up). Documented as a known V1 limitation.
 *
 * Brevo is optional: if BREVO_API_KEY is not configured the endpoint still
 * validates and returns 200 with { stored: false } and logs a warning —
 * but it NEVER returns a fake success while the upstream actually failed.
 * The form only shows "listo" on a real 2xx.
 *
 * Env:
 *   BREVO_API_KEY  (optional)  — Brevo v3 API key
 *   BREVO_LIST_ID  (optional)  — numeric list id, defaults to 3
 */

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const ipHits = new Map(); // ip -> number[] (timestamps), best-effort

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const body =
    req.body && typeof req.body === 'object'
      ? req.body
      : safeParse(req.body);

  const email = String(body.email || '').trim().toLowerCase();
  const honeypot = String(body.hp || '').trim();

  // 1. Honeypot — pretend success, store nothing.
  if (honeypot) return res.status(200).json({ ok: true, stored: false });

  // 2. Server-authoritative email shape check.
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  // 3. Best-effort per-IP rate limit.
  const ip =
    String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const now = Date.now();
  const recent = (ipHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    return res.status(429).json({ error: 'rate_limited' });
  }
  recent.push(now);
  ipHits.set(ip, recent);

  // 4. Store in Brevo if configured.
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('[subscribe] BREVO_API_KEY not set — accepted but not stored:', email);
    return res.status(200).json({ ok: true, stored: false });
  }

  const listId = Number(process.env.BREVO_LIST_ID || 3);

  try {
    const r = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({ email, listIds: [listId], updateEnabled: true }),
    });

    if (r.ok || r.status === 204) {
      return res.status(200).json({ ok: true, stored: true });
    }

    // Brevo returns 400 "duplicate_parameter" when the contact already
    // exists — that is a success from the user's point of view.
    if (r.status === 400) {
      const data = await r.json().catch(() => ({}));
      if (String(data.code) === 'duplicate_parameter') {
        return res.status(200).json({ ok: true, stored: true });
      }
    }

    console.error('[subscribe] Brevo error', r.status, await r.text().catch(() => ''));
    return res.status(502).json({ error: 'upstream_error' });
  } catch (err) {
    console.error('[subscribe] request failed', err);
    return res.status(502).json({ error: 'upstream_error' });
  }
}

function safeParse(raw) {
  if (typeof raw !== 'string' || !raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
