/**
 * Genera una imagen de portada propia por artículo y actualiza su frontmatter.
 * Uso: npx tsx scripts/generar-portadas.ts
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { portadaSVG } from '../agentes/lib/portada';
import { categoriaPorSlug, colorCategoria } from '../src/lib/sitio';

const DIR_ART = resolve(process.cwd(), 'src/content/articulos');
const DIR_IMG = resolve(process.cwd(), 'public/imagenes');
mkdirSync(DIR_IMG, { recursive: true });

let generadas = 0;
for (const archivo of readdirSync(DIR_ART)) {
  if (!archivo.endsWith('.md') && !archivo.endsWith('.mdx')) continue;
  const slug = archivo.replace(/\.(md|mdx)$/, '');
  const ruta = resolve(DIR_ART, archivo);
  const contenido = readFileSync(ruta, 'utf8');

  const m = contenido.match(/^---\n([\s\S]*?)\n---/);
  if (!m || m[1] === undefined) continue;
  const fmTexto: string = m[1];
  const fm = parse(fmTexto) as { titulo?: string; categoria?: string };
  const titulo = fm.titulo ?? slug;
  const categoria = fm.categoria ?? 'actualidad';
  const seccion = categoriaPorSlug(categoria)?.nombre ?? 'Actualidad';

  // 1) Generar el SVG de portada.
  const svg = portadaSVG(titulo, seccion, colorCategoria(categoria));
  writeFileSync(resolve(DIR_IMG, `${slug}.svg`), svg, 'utf8');

  // 2) Apuntar el frontmatter a esa imagen.
  const rutaImagen = `/imagenes/${slug}.svg`;
  let nuevoFm: string = fmTexto;
  if (/^imagen:.*$/m.test(nuevoFm)) {
    nuevoFm = nuevoFm.replace(/^imagen:.*$/m, `imagen: '${rutaImagen}'`);
  } else {
    nuevoFm += `\nimagen: '${rutaImagen}'`;
  }
  const nuevoContenido = contenido.replace(m[0], `---\n${nuevoFm}\n---`);
  writeFileSync(ruta, nuevoContenido, 'utf8');
  generadas++;
  // eslint-disable-next-line no-console
  console.log(`  ✓ ${slug}  (${seccion})`);
}

// eslint-disable-next-line no-console
console.log(`\n${generadas} portada(s) generada(s) en public/imagenes/.`);
