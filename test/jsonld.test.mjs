import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read } from './helpers.mjs';

const index = read('index.html');

const blocks = [...index.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((m) => JSON.parse(m[1]));

test('index: exactly one JSON-LD block, valid JSON', () => {
  assert.equal(blocks.length, 1);
});

test('index: JSON-LD is Organization + WebSite only', () => {
  const graph = Array.isArray(blocks[0]) ? blocks[0] : [blocks[0]];
  const types = graph.map((n) => n['@type']).sort();
  assert.deepEqual(types, ['Organization', 'WebSite']);
  for (const node of graph) {
    assert.equal(node['@context'], 'https://schema.org');
  }
});

test('index: JSON-LD describes only real, verifiable facts', () => {
  const flat = JSON.stringify(blocks[0]);
  for (const forbidden of [
    'aggregateRating',
    'ratingValue',
    'reviewCount',
    'review',
    'offers',
    'price',
    'award',
    'downloadUrl',
    'installUrl',
    'MobileApplication',
    'SoftwareApplication',
  ]) {
    assert.ok(!flat.includes(forbidden), `JSON-LD must not contain "${forbidden}"`);
  }
});

test('index: Organization has name/url/sameAs matching the site', () => {
  const graph = Array.isArray(blocks[0]) ? blocks[0] : [blocks[0]];
  const org = graph.find((n) => n['@type'] === 'Organization');
  assert.equal(org.name, 'Humans');
  assert.equal(org.url, 'https://gethumans.app/');
  assert.ok(org.sameAs.includes('https://www.instagram.com/humans_app'));
});
