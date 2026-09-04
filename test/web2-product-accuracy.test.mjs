import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read } from './helpers.mjs';

const index = read('index.html');

test('WEB-2: false "always exact location" claims are gone', () => {
  assert.ok(
    !/ves\s+exactamente\s+d[oó]nde\s+est[aá]\s+pasando\s+todo/i.test(index),
    'must not claim the map always shows exactly where everything is',
  );
  assert.ok(
    !/[Cc]ada\s+evento\s+muestra\s+(su\s+)?lugar,?\s+(su\s+)?d[ií]a\s+y\s+(su\s+)?hora\s+exactos/i.test(index),
    'must not claim every event always shows an exact address',
  );
});

test('WEB-2: no false "no categories" claim (event creation has a mandatory category field)', () => {
  assert.ok(!/no\s+tiene\s+categor[ií]as/i.test(index), 'Humans does have a category field on event creation');
  assert.ok(!/no\s+encasilla/i.test(index));
});

test('WEB-2: request-type events are described as approximate-until-accepted, not always exact', () => {
  const eventos = index.slice(index.indexOf('id="eventos"'), index.indexOf('id="encuentro"'));
  assert.match(eventos, /zona aproximada/i, 'request card mentions approximate zone');
  assert.match(eventos, /hasta\s+(que\s+)?(el\s+organizador\s+te\s+acepta|ser aceptado)/i);
  // open is the only type where an exact address is unconditional
  assert.match(eventos, /Abierto[\s\S]{0,300}exact[oa]/i);
});

test('WEB-2: three event types are all present (open / request / private)', () => {
  assert.match(index, />Abierto</);
  assert.match(index, />Por solicitud</);
  assert.match(index, />Privado</);
});

test('WEB-2: Estados section exists, is human (no exact-location / real-time-tracking language)', () => {
  const estados = index.slice(index.indexOf('id="estados"'), index.indexOf('id="eventos"'));
  assert.match(estados, /Gente con ganas/);
  assert.match(estados, /tempor/i, 'mentions status is temporary');
  for (const bad of [/ubicaci[oó]n exacta/i, /en tiempo real/i, /a \d+\s?(m|km|metros)\b/i]) {
    assert.ok(!bad.test(estados), `Estados section must not say ${bad}`);
  }
});

test('WEB-2: the Estado -> Chat -> Event loop section exists and is compact (visual, not a wall of text)', () => {
  assert.match(index, /id="encuentro"/);
  const loop = index.slice(index.indexOf('id="encuentro"'), index.indexOf('id="mapa"'));
  assert.match(loop, /class="loop[\s"]/);
  for (const label of ['Estado', 'Respond', 'Chat', 'evento', 'afuera']) {
    assert.match(loop, new RegExp(label, 'i'));
  }
  // visual-first: no long paragraphs inside the loop block itself
  const loopOnly = loop.slice(loop.indexOf('class="loop'));
  assert.ok(!/<p[^>]*>[^<]{160,}/.test(loopOnly), 'loop block should stay visual, not a long paragraph');
});

test('WEB-2: Map section explains variable precision, not "see everything exactly"', () => {
  const mapa = index.slice(index.indexOf('id="mapa"'), index.indexOf('id="personas"'));
  assert.match(mapa, /zona aproximada/i);
  assert.match(mapa, /sin revelar más ubicación de la necesaria/i);
  assert.ok(!/ves exactamente/i.test(mapa));
});

test('WEB-2: NOW markers on the map use a distinct avatar shape, not a location pin', () => {
  const mapa = index.slice(index.indexOf('id="mapa"'), index.indexOf('id="personas"'));
  assert.match(mapa, /avatar-marker/, 'a NOW status is rendered as an avatar marker, not <div class="pin">');
});

test('WEB-2: attendance-privacy claim is opt-out framing, not an absolute "private" claim', () => {
  const privacidad = index.slice(index.indexOf('id="privacidad"'), index.indexOf('id="experiencia"'));
  assert.ok(!/tu asistencia es privada/i.test(privacidad), 'attendance visibility defaults ON, not private');
  assert.ok(!/no se anuncia/i.test(privacidad));
  assert.match(privacidad, /decid[ií]s? qui[eé]n te ve ir|control(a|á)r? si tus amigos ven/i);
});

test('WEB-2: nav reflects the new IA (Estados / Eventos / Personas / Privacidad)', () => {
  const nav = index.slice(index.indexOf('<nav>'), index.indexOf('</nav>'));
  for (const href of ['#estados', '#eventos', '#personas', '#privacidad']) {
    assert.match(nav, new RegExp(`href="${href}"`));
  }
  assert.ok(!nav.includes('#descubri'), 'the retired Descubrí section should not be linked from nav');
});

test('WEB-2: hero ghost CTA points at a real section (no dangling #descubri anchor)', () => {
  assert.ok(!index.includes('href="#descubri"'), 'no remaining links to the removed Descubrí section');
  assert.ok(!index.includes('id="descubri"'), 'the Descubrí section id should be fully retired');
});

test('WEB-2: Stories framed as a layer, not the center of the product', () => {
  const historias = index.slice(index.indexOf('id="historias"'), index.indexOf('id="privacidad"'));
  assert.match(historias, /no el centro/i);
});

test('WEB-2: people/social section avoids dating-app framing', () => {
  const personas = index.slice(index.indexOf('id="personas"'), index.indexOf('id="historias"'));
  for (const bad of [/match/i, /dating/i, /cita\b/i, /soltero/i]) {
    assert.ok(!bad.test(personas), `personas section must not read as a dating app (${bad})`);
  }
});
