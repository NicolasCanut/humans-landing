import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, linkHref } from './helpers.mjs';

const pages = {
  privacidad: read('privacidad.html'),
  terminos: read('terminos.html'),
  normas: read('normas-de-la-comunidad.html'),
  eliminarCuenta: read('eliminar-cuenta.html'),
  tusDatos: read('tus-datos.html'),
};

test('legal pages: each has one h1, a date, canonical, and is indexable', () => {
  for (const [name, html] of Object.entries(pages)) {
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${name} one h1`);
    assert.match(html, /Última actualización:/, `${name} has a date`);
    assert.ok(linkHref(html, 'canonical'), `${name} canonical`);
    assert.match(html, /name="robots"[^>]+index/, `${name} indexable`);
  }
});

test('terminos: is the age-13/18-consistent hardened version', () => {
  assert.match(pages.terminos, /13 de septiembre de 2026/);
  assert.match(pages.terminos, /tolerancia cero/i);
  assert.match(pages.terminos, /Seguridad en encuentros presenciales/i);
  assert.match(pages.terminos, /Rosario, Santa Fe/);
  assert.match(pages.terminos, /al menos 13 años/);
  assert.match(pages.terminos, /mayores de 18 años/);
});

test('privacidad: is the reconciled version with concrete deletion + data-request paths', () => {
  assert.match(pages.privacidad, /13 de septiembre de 2026/);
  assert.match(pages.privacidad, /Ley 25\.326/);
  assert.match(pages.privacidad, /AAIP|Agencia de Acceso a la Información Pública/);
  assert.match(pages.privacidad, /Eliminar mi cuenta de Humans/); // email subject line
  assert.match(pages.privacidad, /Perfil → Configuración/); // in-app path
  assert.match(pages.privacidad, /href="\/eliminar-cuenta\.html"/);
  assert.match(pages.privacidad, /href="\/tus-datos\.html"/);
});

test('age policy: 13+ general account, 18+ Estados only — never "cuentas desde los 18"', () => {
  const index = read('index.html');
  for (const [name, html] of [['index', index], ...Object.entries(pages)]) {
    assert.ok(!/cuentas?\s+desde\s+los\s+18/i.test(html), `${name} must not claim the whole app is 18+`);
  }
  // the app-wide gate is 13+, and Estados is called out as its own 18+ gate
  assert.match(pages.terminos, /al menos 13 años/);
  assert.match(pages.normas, /al menos 13 años/);
  assert.match(index, /mayores de 13/);
  assert.match(index, /mayores de 18/);
});

test('legal pages: no stale "Abril 2026" and no placeholder text', () => {
  for (const [name, html] of Object.entries(pages)) {
    assert.ok(!/Abril 2026/i.test(html), `${name} still says Abril 2026`);
    assert.ok(!/lorem ipsum|FIXME|\bTK\b|TKTK|placeholder|xxxxx/i.test(html), `${name} placeholder`);
  }
});

test('legal + index footers: link privacy, terms, community guidelines, delete account and data request pages', () => {
  for (const html of [read('index.html'), ...Object.values(pages)]) {
    assert.match(html, /href="\/privacidad\.html"/);
    assert.match(html, /href="\/terminos\.html"/);
    assert.match(html, /href="\/normas-de-la-comunidad\.html"/);
    assert.match(html, /href="\/eliminar-cuenta\.html"/);
    assert.match(html, /href="\/tus-datos\.html"/);
  }
});

test('eliminar-cuenta / tus-datos: state the real process, no fake self-service web deletion', () => {
  assert.match(pages.eliminarCuenta, /Perfil → Configuración/);
  assert.match(pages.eliminarCuenta, /permanente e irreversible/);
  assert.match(pages.eliminarCuenta, /mailto:humansapp\.oficial@gmail\.com\?subject=Eliminar%20mi%20cuenta%20de%20Humans/);
  assert.match(pages.tusDatos, /Perfil → Configuración/);
  assert.match(pages.tusDatos, /sin (borrar|eliminar) (el resto de )?tu cuenta/i);
  // neither page may claim a working in-browser deletion form (there isn't one)
  for (const [name, html] of [['eliminarCuenta', pages.eliminarCuenta], ['tusDatos', pages.tusDatos]]) {
    assert.ok(!/<form/i.test(html), `${name} must not present a fake self-service form`);
  }
  // each links to the other, since they are two distinct requests
  assert.match(pages.eliminarCuenta, /href="\/tus-datos\.html"/);
  assert.match(pages.tusDatos, /href="\/eliminar-cuenta\.html"/);
});
