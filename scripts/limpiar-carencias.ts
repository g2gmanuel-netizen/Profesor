/**
 * Limpia los artículos ya publicados de frases sobre fuentes internas o datos que
 * faltan ("la ficha no detalla", "no consta", "lo que todavía no sabemos"...).
 * Uso: npx tsx scripts/limpiar-carencias.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import { limpiarCarencias, limpiarLista } from '../agentes/lib/carencias';

const DIR = resolve(process.cwd(), 'src/content/articulos');
let cambiados = 0;
for (const f of readdirSync(DIR).filter((x) => /\.(md|mdx)$/.test(x))) {
  const ruta = resolve(DIR, f);
  const original = readFileSync(ruta, 'utf8');
  const m = original.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) continue;
  let fmTexto = m[1]!;
  const fm = parse(fmTexto) as Record<string, unknown>;
  if (Array.isArray(fm.clavesRapidas)) {
    const limpias = limpiarLista(fm.clavesRapidas as string[]);
    if (limpias.length !== (fm.clavesRapidas as string[]).length) {
      fm.clavesRapidas = limpias;
      fmTexto = stringify(fm).trimEnd();
    }
  }
  const cuerpo = original.slice(m[0].length);
  const nuevo = `---\n${fmTexto}\n---\n\n${limpiarCarencias(cuerpo)}\n`;
  if (nuevo !== original) {
    writeFileSync(ruta, nuevo, 'utf8');
    cambiados++;
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${f}`);
  }
}
// eslint-disable-next-line no-console
console.log(`Artículos limpiados: ${cambiados}`);
