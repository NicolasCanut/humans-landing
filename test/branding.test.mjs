import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, HTML_PAGES } from './helpers.mjs';

const all = HTML_PAGES.map((p) => [p, read(p)]);

test('all pages: Instagram link is the canonical www handle', () => {
  for (const [p, html] of all) {
    if (!/instagram/i.test(html)) continue;
    assert.match(html, /https:\/\/www\.instagram\.com\/humans_app/, `${p} instagram url`);
    assert.ok(
      !/["']https:\/\/instagram\.com\/humans_app/.test(html),
      `${p} still uses non-www instagram`,
    );
  }
});

test('all pages: no leftover "./index.html" relative links (use "/")', () => {
  for (const [p, html] of all) {
    assert.ok(!html.includes('./index.html'), `${p} uses ./index.html`);
    assert.ok(!html.includes('href="./'), `${p} uses ./ relative href`);
  }
});

test('all pages: no misnamed favicon.svg-as-png and no oversized favicon.png as icon rel', () => {
  for (const [p, html] of all) {
    assert.ok(
      !/rel="icon"[^>]+type="image\/svg\+xml"[^>]+favicon\.png/.test(html),
      `${p} declares png as svg`,
    );
  }
});

test('all pages: no old combined tagline and no placeholder domains', () => {
  for (const [p, html] of all) {
    assert.ok(!/La vida pasa afuera\. Y está pasando ahora\./.test(html), `${p} old tagline`);
    assert.ok(!/example\.com|localhost|127\.0\.0\.1/.test(html), `${p} placeholder domain`);
  }
});

test('index: hero uses the brand hierarchy (wordmark + tagline + lede)', () => {
  const index = read('index.html');
  assert.match(index, /class="hero-wordmark">Humans<span class="dot">\.<\/span>/);
  assert.match(index, /class="hero-tagline">La vida pasa afuera\./);
  assert.match(index, /class="hero-lede">/);
});

test('index: no invented / deferred features are claimed', () => {
  const index = read('index.html').toLowerCase();
  for (const banned of [
    'dni',
    'identidad verificada',
    'identidad validada',
    'verificación de identidad',
    'app check',
    'matchmaking',
    'inteligencia artificial',
    ' ia ',
    'segundo plano', // background location
    'en segundo plano',
    '100% privado',
    '100% seguro',
    'totalmente seguro',
    'nadie puede ver',
  ]) {
    assert.ok(!index.includes(banned), `index claims "${banned.trim()}"`);
  }
});

test('brand mark: landing uses the official hug logo, not the old hand-drawn H', () => {
  const index = read('index.html');
  // the simplified hand-drawn <path> mark must be gone everywhere
  assert.ok(!/M15 14h8v12h18V14h8v31h-8V33H23v12h-8z/.test(index), 'old hand-drawn H path still present');
  // nav, hero and footer all reference the copied official asset
  assert.equal((index.match(/\/humans-logo\.png/g) || []).length, 3, 'humans-logo.png used in nav + hero + footer');
  assert.match(index, /class="hero-mark" src="\/humans-logo\.png"/);
  // and it is a real local asset in the repo (not cross-repo)
  assert.ok(read('humans-logo.png').length > 1000, 'humans-logo.png asset exists');
});

test('assets: no favicon.svg, favicons are png', () => {
  assert.throws(() => read('favicon.svg'), 'favicon.svg should not exist anymore');
  for (const f of ['favicon-32.png', 'icon-192.png', 'apple-touch-icon.png', 'favicon.png']) {
    assert.ok(read(f).length > 200, `${f} exists`);
  }
});

test('user-select: marketing surfaces suppress accidental selection but keep inputs selectable', () => {
  for (const p of ['index.html', 'event.html', 'story.html']) {
    const html = read(p);
    assert.match(html, /body\s*\{[^}]*user-select:\s*none/s, `${p} body user-select:none`);
    assert.match(html, /-webkit-user-select:\s*none/, `${p} webkit prefix (mobile Safari)`);
    assert.match(
      html,
      /input,\s*textarea[^{]*\{[^}]*user-select:\s*text/s,
      `${p} form fields opt back into selection`,
    );
  }
  // no JS is used for this
  for (const p of ['index.html', 'event.html', 'story.html']) {
    assert.ok(!/onselectstart|preventDefault\(\)[^;]*select/i.test(read(p)), `${p} uses CSS only`);
  }
});

test('user-select: legal pages stay fully selectable', () => {
  for (const p of ['privacidad.html', 'terminos.html', 'normas-de-la-comunidad.html', 'eliminar-cuenta.html', 'tus-datos.html']) {
    const html = read(p);
    assert.ok(!/user-select:\s*none/.test(html), `${p} must not block text selection`);
  }
});
