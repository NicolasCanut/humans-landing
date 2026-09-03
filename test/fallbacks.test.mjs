import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, meta } from './helpers.mjs';

const event = read('event.html');
const story = read('story.html');

test('event/story: explicitly noindex', () => {
  for (const [name, html] of [['event', event], ['story', story]]) {
    const r = meta(html, 'robots');
    assert.ok(r && /noindex/.test(r), `${name} noindex`);
  }
});

test('event/story: purely static — no server templating tokens', () => {
  for (const [name, html] of [['event', event], ['story', story]]) {
    for (const tok of ['{{', '}}', '<%', '%>', '${', 'v-bind', 'ng-']) {
      assert.ok(!html.includes(tok), `${name} contains template token ${tok}`);
    }
  }
});

test('event/story: never reference private event/story data fields', () => {
  const leaky = [
    /lista de invitados/i,
    /invitad[oa]s\b/i,
    /guest ?list/i,
    /ubicaci[oó]n exacta/i,
    /direcci[oó]n exacta/i,
    /asistentes?:/i,
    /coordenadas/i,
    /lat(itud)?[=:]/i,
    /lng|longitud[=:]/i,
  ];
  for (const [name, html] of [['event', event], ['story', story]]) {
    for (const re of leaky) {
      assert.ok(!re.test(html), `${name} matches ${re}`);
    }
  }
});

test('event/story: offer an "abrir en la app" affordance + safe canonical', () => {
  for (const [name, html] of [['event', event], ['story', story]]) {
    assert.match(html, /Abrir en la app/i, `${name} open-in-app CTA`);
    assert.match(html, /rel="canonical" href="https:\/\/gethumans\.app\/"/, `${name} canonical`);
    assert.match(html, /og:url" content="https:\/\/gethumans\.app\/"/, `${name} og:url`);
  }
});

test('event: deep link uses the app custom scheme, built client-side from the URL', () => {
  assert.match(event, /humansclean:\/\/events\//);
  assert.match(story, /humansclean:\/\/story\//);
});

test('event/story: og:image is the shared card, not the favicon', () => {
  for (const html of [event, story]) {
    assert.equal(meta(html, 'og:image'), 'https://gethumans.app/og-default.png');
  }
});
