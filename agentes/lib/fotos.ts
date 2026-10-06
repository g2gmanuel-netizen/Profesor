import { writeFileSync } from 'node:fs';

/**
 * Búsqueda y descarga de fotos con licencia de uso comercial. Admite dos bancos
 * de fotos gratuitos; usa el que tenga clave en el entorno (Pixabay primero):
 *   - PIXABAY_API_KEY  (https://pixabay.com/api/docs/) — sin atribución obligatoria
 *   - PEXELS_API_KEY   (https://www.pexels.com/api/)   — sin atribución obligatoria
 * Si no hay clave o algo falla, devuelve null y el sistema usa la portada propia
 * de color. Nunca usa imágenes con derechos de autor.
 *
 * La foto se busca a partir del TÍTULO concreto de la noticia (para que vaya
 * acorde), y si esa búsqueda no da resultados se recurre a un término genérico de
 * la sección como red de seguridad.
 */

export interface FotoDescargada {
  rutaPublica: string; // p.ej. /imagenes/slug.jpg
  credito: string; // "Foto: Autor (Pixabay)"
  alt: string;
}

/** Términos de respaldo por sección (si la búsqueda por título no da resultados). */
const QUERY_SECCION: Record<string, string> = {
  actualidad: 'noticias periódico',
  politica: 'parlamento gobierno',
  sociedad: 'gente ciudad',
  vivienda: 'edificio vivienda',
  hipotecas: 'casa llaves',
  alquiler: 'apartamento alquiler',
  ahorro: 'ahorro monedas euro',
  impuestos: 'calculadora documentos',
  pensiones: 'persona mayor',
  precios: 'supermercado compra',
  bolsa: 'bolsa valores gráfico',
};

const VACIAS = new Set([
  'el','la','los','las','un','una','unos','unas','de','del','al','a','y','o','u','que','qué','como','cómo',
  'en','con','por','para','su','tu','tus','sus','se','lo','le','les','es','son','ser','más','mas','ya','si',
  'sí','no','me','mi','te','ti','nos','este','esta','esto','estos','estas','ese','esa','eso','cuando','cuánto',
  'cuanto','donde','dónde','porque','sobre','entre','hasta','desde','muy','ante','tras','cada','otro','otra',
  'vas','va','van','hacer','puede','puedes','debe','debes','e','ni','pero','hay','está','están','saber',
]);

const sinTildes = (w: string): string => w.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Extrae las palabras con contenido de un texto (sin artículos, preposiciones, números…). */
function palabrasClave(texto: string, n: number): string[] {
  const limpio = texto.toLowerCase().replace(/[^\p{L}\s]/gu, ' ');
  const out: string[] = [];
  for (const w of limpio.split(/\s+/)) {
    if (w.length > 3 && !VACIAS.has(sinTildes(w)) && !out.includes(w)) out.push(w);
    if (out.length >= n) break;
  }
  return out;
}

/**
 * Construye la búsqueda específica de la noticia a partir del título (y una
 * etiqueta como refuerzo). Pensada para que la foto vaya acorde con el contenido.
 */
export function queryParaArticulo(
  categoria: string,
  etiquetas: string[] = [],
  titulo = '',
): string {
  const claves = palabrasClave(titulo, 3);
  const etiqueta = etiquetas.find((t) => t.length > 3 && !claves.includes(t.toLowerCase()));
  const q = [...claves, etiqueta].filter(Boolean).join(' ').trim();
  return (q || QUERY_SECCION[categoria] || 'españa actualidad').slice(0, 80);
}

/** Término genérico de respaldo de la sección. */
export function queryFallback(categoria: string): string {
  return QUERY_SECCION[categoria] ?? 'españa actualidad';
}

export function hayClaveFotos(): boolean {
  return Boolean(process.env.PIXABAY_API_KEY || process.env.PEXELS_API_KEY);
}

async function guardar(urlImagen: string, destinoAbsSinExt: string): Promise<boolean> {
  const ir = await fetch(urlImagen);
  if (!ir.ok) return false;
  const buf = Buffer.from(await ir.arrayBuffer());
  writeFileSync(`${destinoAbsSinExt}.jpg`, buf);
  return true;
}

async function pixabay(query: string, opts: Opts): Promise<FotoDescargada | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  const url =
    'https://pixabay.com/api/?image_type=photo&orientation=horizontal&safesearch=true&lang=es&per_page=6&key=' +
    encodeURIComponent(key) +
    '&q=' +
    encodeURIComponent(query);
  const r = await fetch(url);
  if (!r.ok) return null;
  const data = (await r.json()) as {
    hits?: { largeImageURL?: string; webformatURL?: string; user?: string; tags?: string }[];
  };
  const hit = data.hits?.[0];
  const img = hit?.largeImageURL ?? hit?.webformatURL;
  if (!hit || !img) return null;
  if (!(await guardar(img, opts.destinoAbsSinExt))) return null;
  return {
    rutaPublica: `/imagenes/${opts.slug}.jpg`,
    credito: `Foto: ${hit.user ?? 'Pixabay'} (Pixabay)`,
    alt: hit.tags ? `${opts.altBase} (${hit.tags.split(',')[0]})` : opts.altBase,
  };
}

async function pexels(query: string, opts: Opts): Promise<FotoDescargada | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const url =
    'https://api.pexels.com/v1/search?orientation=landscape&per_page=6&query=' + encodeURIComponent(query);
  const r = await fetch(url, { headers: { Authorization: key } });
  if (!r.ok) return null;
  const data = (await r.json()) as {
    photos?: { src?: { landscape?: string; large?: string }; photographer?: string; alt?: string }[];
  };
  const foto = data.photos?.[0];
  const img = foto?.src?.landscape ?? foto?.src?.large;
  if (!foto || !img) return null;
  if (!(await guardar(img, opts.destinoAbsSinExt))) return null;
  return {
    rutaPublica: `/imagenes/${opts.slug}.jpg`,
    credito: `Foto: ${foto.photographer ?? 'Pexels'} (Pexels)`,
    alt: foto.alt && foto.alt.length > 5 ? foto.alt : opts.altBase,
  };
}

interface Opts {
  query: string; // búsqueda específica de la noticia (por título)
  queryFallback?: string; // término genérico de la sección, si la específica falla
  destinoAbsSinExt: string;
  slug: string;
  altBase: string;
}

/**
 * Descarga una foto con licencia al destino indicado. Prueba primero la búsqueda
 * específica de la noticia y, si no hay resultados, el término genérico de la
 * sección. Pixabay primero, Pexels después.
 */
export async function descargarFoto(opts: Opts): Promise<FotoDescargada | null> {
  const queries = Array.from(new Set([opts.query, opts.queryFallback].filter((q): q is string => !!q && q.length > 1)));
  for (const q of queries) {
    try {
      const foto = (await pixabay(q, opts)) ?? (await pexels(q, opts));
      if (foto) return foto;
    } catch {
      // probamos la siguiente búsqueda
    }
  }
  return null;
}
