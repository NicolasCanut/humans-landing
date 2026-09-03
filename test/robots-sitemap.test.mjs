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
    ].sort(),
  );
});

test('sitemap.xml: never exposes dynamic / private routes', () => {
  for (const bad of ['/event/', '/story/', '/api/', '/u/', 'now', 'token']) {
    assert.ok(!sitemap.includes(bad), `sitemap must not contain "${bad}"`);
  }
});
