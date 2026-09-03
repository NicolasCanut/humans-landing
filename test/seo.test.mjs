import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, meta, linkHref, countMatches, HTML_PAGES } from './helpers.mjs';

const index = read('index.html');

test('index: one <h1>, lang=es, charset, viewport', () => {
  assert.equal(countMatches(index, /<h1[\s>]/g), 1, 'exactly one h1');
  assert.match(index, /<html lang="es">/);
  assert.match(index, /<meta charset="UTF-8"/i);
  assert.match(index, /name="viewport"/i);
});

test('index: title present and reasonable length', () => {
  const t = index.match(/<title>([^<]*)<\/title>/i)[1];
  assert.ok(t.includes('Humans'));
  assert.ok(t.length >= 10 && t.length <= 65, `title length ${t.length}`);
});

test('index: meta description explains the product, 70-165 chars', () => {
  const d = meta(index, 'description');
  assert.ok(d, 'has description');
  assert.ok(d.length >= 70 && d.length <= 165, `description length ${d.length}`);
  assert.ok(/evento|plan/i.test(d), 'description mentions what Humans is');
});

test('index: canonical is the apex root', () => {
  assert.equal(linkHref(index, 'canonical'), 'https://gethumans.app/');
});

test('index: robots allows indexing', () => {
  const r = meta(index, 'robots');
  assert.ok(r && /index/.test(r) && !/noindex/.test(r));
});

test('index: theme-color + manifest + icons', () => {
  assert.equal(meta(index, 'theme-color'), '#080B10');
  assert.equal(linkHref(index, 'manifest'), '/site.webmanifest');
  assert.ok(/rel="icon"[^>]+favicon-32\.png/.test(index), 'has a png favicon');
  assert.ok(/rel="apple-touch-icon"/.test(index));
  assert.ok(!/favicon\.svg/.test(index), 'the hand-drawn favicon.svg is gone');
});

test('index: Open Graph tags present and consistent', () => {
  assert.equal(meta(index, 'og:title'), 'Humans — La vida pasa afuera');
  assert.ok(meta(index, 'og:description'));
  assert.equal(meta(index, 'og:url'), 'https://gethumans.app/');
  assert.equal(meta(index, 'og:type'), 'website');
  assert.equal(meta(index, 'og:image'), 'https://gethumans.app/og-default.png');
  assert.equal(meta(index, 'og:image:width'), '1200');
  assert.equal(meta(index, 'og:image:height'), '630');
});

test('index: Twitter card present', () => {
  assert.equal(meta(index, 'twitter:card'), 'summary_large_image');
  assert.ok(meta(index, 'twitter:image'));
});

test('index: OG image is a real card, never the favicon', () => {
  assert.ok(!/og:image"[^>]+favicon/i.test(index));
});

test('every page: has canonical + charset + viewport', () => {
  for (const p of HTML_PAGES) {
    const html = read(p);
    assert.ok(linkHref(html, 'canonical'), `${p} canonical`);
    assert.match(html, /<meta charset=/i, `${p} charset`);
    assert.match(html, /name="viewport"/i, `${p} viewport`);
  }
});
