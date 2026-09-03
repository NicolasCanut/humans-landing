import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read } from './helpers.mjs';

const aasa = JSON.parse(read('.well-known/apple-app-site-association'));

test('AASA: valid JSON with the Humans app id', () => {
  const detail = aasa.applinks.details[0];
  assert.ok(detail.appIDs.includes('GM33AU2MJJ.com.NicolasCanut.humans'));
});

test('AASA: only /story/* and /event/* are handled', () => {
  const comps = aasa.applinks.details[0].components.map((c) => c['/']).sort();
  assert.deepEqual(comps, ['/event/*', '/story/*']);
});

test('AASA: no profile / now / invite paths leak into universal links', () => {
  const flat = JSON.stringify(aasa);
  for (const bad of ['/u/', '/now/', '/invite', '/profile']) {
    assert.ok(!flat.includes(bad), `AASA must not route ${bad}`);
  }
});
