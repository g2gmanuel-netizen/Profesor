/**
 * Pone una foto real (Pixabay o Pexels) a cada artículo que lo necesite y
 * actualiza su frontmatter. Requiere PIXABAY_API_KEY o PEXELS_API_KEY. Si no
 * hay ninguna, no hace nada.
 * Uso: PIXABAY_API_KEY=xxx npx tsx scripts/fotos-articulos.ts
 * (Normalmente se lanza desde el workflow de GitHub "Fotos de artículos".)
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import { descargarFoto, queryParaArticulo, queryFallback, hayClaveFotos, huella } from '../agentes/lib/fotos';

// Con REEMPLAZAR_FOTOS=true se vuelven a descargar también las fotos ya puestas
// (para refrescarlas con una búsqueda más acorde a cada noticia).
const REEMPLAZAR = process.env.REEMPLAZAR_FOTOS === 'true';

if (!hayClaveFotos()) {
  // eslint-disable-next-line no-console
  console.log(
    'No hay PIXABAY_API_KEY ni PEXELS_API_KEY. No se descargan fotos (se mantienen las portadas de color).',
  );
  process.exit(0);
}

const DIR_ART = resolve(process.cwd(), 'src/content/articulos');
const DIR_IMG = resolve(process.cwd(), 'public/imagenes');
mkdirSync(DIR_IMG, { recursive: true });

/**
 * Detecta artículos que comparten exactamente la misma foto. Se conserva la del
 * artículo más antiguo y los demás se marcan para descargar una foto nueva.
 */
function slugsConFotoRepetida(): Set<string> {
  const porHuella = new Map<string, { slug: string; fecha: string }[]>();
  for (const archivo of readdirSync(DIR_ART)) {
    if (!/\.(md|mdx)$/.test(archivo)) continue;
    const slug = archivo.replace(/\.(md|mdx)$/, '');
    const m = readFileSync(resolve(DIR_ART, archivo), 'utf8').match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue;
    const fm = parse(m[1]!) as Record<string, unknown>;
    const img = typeof fm.imagen === 'string' ? fm.imagen : '';
    if (!img.endsWith('.jpg')) continue;
    const ruta = resolve(process.cwd(), 'public', img.replace(/^\//, ''));
    if (!existsSync(ruta)) continue;
    const h = huella(readFileSync(ruta));
    const fecha = String(fm.fechaPublicacion instanceof Date ? fm.fechaPublicacion.toISOString() : fm.fechaPublicacion ?? '');
    porHuella.set(h, [...(porHuella.get(h) ?? []), { slug, fecha }]);
  }
  const repetidos = new Set<string>();
  for (const grupo of porHuella.values()) {
    if (grupo.length < 2) continue;
    grupo.sort((a, b) => a.fecha.localeCompare(b.fecha));
    grupo.slice(1).forEach((g) => repetidos.add(g.slug));
  }
  return repetidos;
}

async function main(): Promise<void> {
  let ok = 0;
  let fallos = 0;
  const repetidos = slugsConFotoRepetida();
  if (repetidos.size > 0) {
    // eslint-disable-next-line no-console
    console.log(`Fotos repetidas detectadas: ${[...repetidos].join(', ')}. Se sustituyen.`);
  }
  for (const archivo of readdirSync(DIR_ART)) {
    if (!archivo.endsWith('.md') && !archivo.endsWith('.mdx')) continue;
    const slug = archivo.replace(/\.(md|mdx)$/, '');
    const ruta = resolve(DIR_ART, archivo);
    const contenido = readFileSync(ruta, 'utf8');
    const m = contenido.match(/^---\n([\s\S]*?)\n---/);
    if (!m || m[1] === undefined) continue;
    const fmTexto: string = m[1];
    const fm = parse(fmTexto) as Record<string, unknown>;
    const categoria = typeof fm.categoria === 'string' ? fm.categoria : 'actualidad';
    const imagen = typeof fm.imagen === 'string' ? fm.imagen : '';
    const titulo = typeof fm.titulo === 'string' ? fm.titulo : slug;
    const etiquetas = Array.isArray(fm.etiquetas) ? (fm.etiquetas as string[]) : [];

    // Los análisis de bolsa llevan su propia portada compuesta (logo + ticker): no la tocamos.
    if (categoria === 'bolsa') continue;

    // Si ya tiene una foto .jpg propia, no la volvemos a descargar
    // (salvo REEMPLAZAR_FOTOS=true o que esté repetida en otro artículo).
    if (imagen.endsWith('.jpg') && !REEMPLAZAR && !repetidos.has(slug)) continue;

    const foto = await descargarFoto({
      query: queryParaArticulo(categoria, etiquetas, titulo),
      queryFallback: queryFallback(categoria),
      destinoAbsSinExt: resolve(DIR_IMG, slug),
      slug,
      altBase: `Imagen del artículo: ${titulo}`,
    });

    if (!foto) {
      fallos++;
      // eslint-disable-next-line no-console
      console.log(`  · sin foto para ${slug} (se mantiene la portada de color)`);
      continue;
    }

    // Actualizamos el frontmatter de forma segura: parseamos, cambiamos los
    // campos de imagen y re-serializamos (así no rompemos textos de varias líneas).
    fm.imagen = foto.rutaPublica;
    fm.imagenAlt = foto.alt;
    fm.imagenCredito = foto.credito;
    const nuevoFm = stringify(fm).trimEnd();
    writeFileSync(ruta, contenido.replace(m[0], `---\n${nuevoFm}\n---`), 'utf8');
    ok++;
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${slug}  →  ${foto.rutaPublica} (${foto.credito})`);
  }
  // eslint-disable-next-line no-console
  console.log(`\nFotos añadidas: ${ok}. Sin foto: ${fallos}.`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Error descargando fotos:', e);
  process.exit(1);
});
