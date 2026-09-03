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
  assert.match(index, /La vida pasa afuera\./);
  assert.match(index, /Descubr[ií] qu[eé] est[aá] pasando cerca/);
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

test('favicon.svg is actually SVG', () => {
  const svg = read('favicon.svg').trim();
  assert.ok(svg.startsWith('<svg') || svg.startsWith('<?xml'), 'favicon.svg is not SVG');
  assert.ok(svg.length < 4000, 'favicon.svg should be tiny');
});
