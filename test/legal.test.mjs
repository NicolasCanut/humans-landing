import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, linkHref } from './helpers.mjs';

const pages = {
  privacidad: read('privacidad.html'),
  terminos: read('terminos.html'),
  normas: read('normas-de-la-comunidad.html'),
};

test('legal pages: each has one h1, a date, canonical, and is indexable', () => {
  for (const [name, html] of Object.entries(pages)) {
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${name} one h1`);
    assert.match(html, /Última actualización:/, `${name} has a date`);
    assert.ok(linkHref(html, 'canonical'), `${name} canonical`);
    assert.match(html, /name="robots"[^>]+index/, `${name} indexable`);
  }
});

test('terminos: is the hardened 2026-08-14 version', () => {
  assert.match(pages.terminos, /14 de agosto de 2026/);
  assert.match(pages.terminos, /tolerancia cero/i);
  assert.match(pages.terminos, /Seguridad en encuentros presenciales/i);
  assert.match(pages.terminos, /Rosario, Santa Fe/);
});

test('privacidad: is the reconciled 2026-08-17 version with concrete deletion paths', () => {
  assert.match(pages.privacidad, /17 de agosto de 2026/);
  assert.match(pages.privacidad, /Ley 25\.326/);
  assert.match(pages.privacidad, /AAIP|Agencia de Acceso a la Información Pública/);
  assert.match(pages.privacidad, /Eliminar mi cuenta de Humans/); // email subject line
  assert.match(pages.privacidad, /Perfil → Configuración/); // in-app path
});

test('legal pages: no stale "Abril 2026" and no placeholder text', () => {
  for (const [name, html] of Object.entries(pages)) {
    assert.ok(!/Abril 2026/i.test(html), `${name} still says Abril 2026`);
    assert.ok(!/lorem ipsum|FIXME|\bTK\b|TKTK|placeholder|xxxxx/i.test(html), `${name} placeholder`);
  }
});

test('legal + index footers: link privacy, terms AND community guidelines', () => {
  for (const html of [read('index.html'), ...Object.values(pages)]) {
    assert.match(html, /href="\/privacidad\.html"/);
    assert.match(html, /href="\/terminos\.html"/);
    assert.match(html, /href="\/normas-de-la-comunidad\.html"/);
  }
});
