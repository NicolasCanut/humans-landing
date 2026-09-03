import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read } from './helpers.mjs';

const cfg = JSON.parse(read('vercel.json'));

test('vercel.json: parses and keeps the deep-link rewrites', () => {
  const dests = cfg.rewrites.map((r) => r.destination).sort();
  assert.deepEqual(dests, ['/event.html', '/story.html']);
  assert.ok(cfg.rewrites.some((r) => r.source.startsWith('/story/')));
  assert.ok(cfg.rewrites.some((r) => r.source.startsWith('/event/')));
});

test('vercel.json: www -> apex redirect is configured', () => {
  const www = cfg.redirects.find(
    (r) => Array.isArray(r.has) && r.has.some((h) => h.type === 'host' && h.value === 'www.gethumans.app'),
  );
  assert.ok(www, 'has a host=www.gethumans.app redirect');
  assert.equal(www.destination, 'https://gethumans.app/$1');
  assert.equal(www.permanent, true);
});

test('vercel.json: /index.html redirects to /', () => {
  const r = cfg.redirects.find((x) => x.source === '/index.html');
  assert.ok(r);
  assert.equal(r.destination, '/');
});

test('vercel.json: clean community-guidelines URL redirects to the .html', () => {
  const r = cfg.redirects.find((x) => x.source === '/normas-de-la-comunidad');
  assert.ok(r);
  assert.equal(r.destination, '/normas-de-la-comunidad.html');
});

test('vercel.json: AASA still served as application/json', () => {
  const aasa = cfg.headers.find((h) => h.source.includes('apple-app-site-association'));
  assert.ok(aasa);
  assert.equal(
    aasa.headers.find((h) => h.key === 'Content-Type').value,
    'application/json',
  );
});

test('vercel.json: security headers present and font/script friendly', () => {
  const global = cfg.headers.find((h) => h.source === '/(.*)');
  assert.ok(global, 'has a global header block');
  const byKey = Object.fromEntries(global.headers.map((h) => [h.key, h.value]));

  assert.equal(byKey['X-Content-Type-Options'], 'nosniff');
  assert.equal(byKey['X-Frame-Options'], 'DENY');
  assert.match(byKey['Referrer-Policy'], /strict-origin/);
  assert.ok(byKey['Permissions-Policy']);
  assert.match(byKey['Strict-Transport-Security'], /max-age=\d{5,}/);

  const csp = byKey['Content-Security-Policy'];
  assert.ok(csp, 'has CSP');
  // must not break Google Fonts or the inline style/script the pages use
  assert.match(csp, /style-src[^;]*'unsafe-inline'/);
  assert.match(csp, /style-src[^;]*https:\/\/fonts\.googleapis\.com/);
  assert.match(csp, /font-src[^;]*https:\/\/fonts\.gstatic\.com/);
  assert.match(csp, /script-src[^;]*'unsafe-inline'/);
  assert.match(csp, /frame-ancestors 'none'/);
  // Universal Links / AASA are OS-level fetches, never affected by CSP; the
  // JSON file is still reachable because CSP does not block resource serving.
});
