import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read } from './helpers.mjs';

const robots = read('robots.txt');
const sitemap = read('sitemap.xml');

test('robots.txt: references the sitemap', () => {
  assert.match(robots, /^Sitemap:\s*https:\/\/gethumans\.app\/sitemap\.xml\s*$/m);
});

test('robots.txt: disallows private / internal surfaces', () => {
  for (const path of ['/api/', '/event/', '/story/', '/.well-known/']) {
    assert.match(robots, new RegExp(`Disallow:\\s*${path.replace(/[/.]/g, '\\$&')}`), path);
  }
});

test('robots.txt: allows the public marketing pages', () => {
  assert.match(robots, /Allow:\s*\/\$/);
  assert.match(robots, /Allow:\s*\/privacidad\.html/);
  assert.match(robots, /Allow:\s*\/eliminar-cuenta\.html/);
  assert.match(robots, /Allow:\s*\/tus-datos\.html/);
});

test('sitemap.xml: well-formed urlset, lists only public canonical URLs', () => {
  assert.match(sitemap, /<\?xml/);
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(
    locs.sort(),
    [
      'https://gethumans.app/',
      'https://gethumans.app/normas-de-la-comunidad.html',
      'https://gethumans.app/privacidad.html',
      'https://gethumans.app/terminos.html',
      'https://gethumans.app/eliminar-cuenta.html',
      'https://gethumans.app/tus-datos.html',
    ].sort(),
  );
});

test('sitemap.xml: legal + compliance pages have a current lastmod, not a stale one', () => {
  for (const loc of ['privacidad.html', 'terminos.html', 'normas-de-la-comunidad.html', 'eliminar-cuenta.html', 'tus-datos.html']) {
    const block = sitemap.slice(sitemap.indexOf(loc));
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)[1];
    assert.equal(lastmod, '2026-09-13', `${loc} lastmod should reflect today's content`);
  }
});

test('sitemap.xml: never exposes dynamic / private routes', () => {
  for (const bad of ['/event/', '/story/', '/api/', '/u/', 'now', 'token']) {
    assert.ok(!sitemap.includes(bad), `sitemap must not contain "${bad}"`);
  }
});
