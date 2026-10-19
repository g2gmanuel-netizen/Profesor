/**
 * Avisa a los buscadores compatibles con IndexNow (Bing, Yandex, Seznam, Naver…;
 * Bing alimenta también a DuckDuckGo, Yahoo y ChatGPT Search) de las páginas nuevas
 * o actualizadas, para que las rastreen al momento en vez de esperar días.
 *
 * Uso: npx tsx scripts/indexnow.ts [días]   (por defecto, artículos de los últimos 3 días)
 * La clave es pública por diseño: se verifica con el fichero /<clave>.txt de la web.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { SITIO } from '../src/lib/sitio';

const CLAVE = '86949397ff0da68cf5ae3eb557b809c6';
const dias = Number(process.argv[2] ?? 3);
const limite = Date.now() - dias * 24 * 3600 * 1000;
const dir = resolve(process.cwd(), 'src/content/articulos');

const urls = new Set<string>([`${SITIO.url}/`, `${SITIO.url}/calculadoras/irpf/`]);
for (const f of readdirSync(dir)) {
  if (!/\.mdx?$/.test(f)) continue;
  const m = readFileSync(resolve(dir, f), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  const fm = (parse(m[1]!) ?? {}) as Record<string, unknown>;
  if (fm.borrador === true) continue;
  const fecha = new Date(String((fm.fechaActualizacion ?? fm.fechaPublicacion) as string | Date)).getTime();
  if (fecha >= limite) urls.add(`${SITIO.url}/articulo/${f.replace(/\.mdx?$/, '')}/`);
}

const cuerpo = {
  host: new URL(SITIO.url).host,
  key: CLAVE,
  keyLocation: `${SITIO.url}/${CLAVE}.txt`,
  urlList: [...urls],
};
const r = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(cuerpo),
});
// eslint-disable-next-line no-console
console.log(`IndexNow: ${r.status} ${r.statusText} · ${urls.size} URL(s)`);
for (const u of urls) console.log('  ', u); // eslint-disable-line no-console
if (r.status >= 400 && r.status !== 429) process.exit(1);
