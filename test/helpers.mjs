import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const read = (p) => readFileSync(join(ROOT, p), 'utf8');

export const HTML_PAGES = [
  'index.html',
  'privacidad.html',
  'terminos.html',
  'normas-de-la-comunidad.html',
  'eliminar-cuenta.html',
  'tus-datos.html',
  'event.html',
  'story.html',
];

/** naive tag-content extractor good enough for these checks */
export const meta = (html, name) => {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`,
    'i',
  );
  const tag = html.match(re);
  if (!tag) return null;
  const c = tag[0].match(/content=["']([^"']*)["']/i);
  return c ? c[1] : null;
};

export const linkHref = (html, rel) => {
  const re = new RegExp(`<link[^>]+rel=["'][^"']*${rel}[^"']*["'][^>]*>`, 'i');
  const tag = html.match(re);
  if (!tag) return null;
  const h = tag[0].match(/href=["']([^"']*)["']/i);
  return h ? h[1] : null;
};

export const countMatches = (s, re) => (s.match(re) || []).length;
