import { writeFileSync } from 'node:fs';

/**
 * Búsqueda y descarga de fotos con licencia de uso comercial. Admite dos bancos
 * de fotos gratuitos; usa el que tenga clave en el entorno (Pixabay primero):
 *   - PIXABAY_API_KEY  (https://pixabay.com/api/docs/) — sin atribución obligatoria
 *   - PEXELS_API_KEY   (https://www.pexels.com/api/)   — sin atribución obligatoria
 * Si no hay clave o algo falla, devuelve null y el sistema usa la portada propia
 * de color. Nunca usa imágenes con derechos de autor.
 */

export interface FotoDescargada {
  rutaPublica: string; // p.ej. /imagenes/slug.jpg
  credito: string; // "Foto: Autor (Pixabay)"
  alt: string;
}

/** Términos de búsqueda por sección, para fotos relevantes y sobrias. */
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
};

export function queryParaArticulo(categoria: string, etiquetas: string[] = []): string {
  const base = QUERY_SECCION[categoria] ?? 'españa actualidad';
  const extra = etiquetas[0] && etiquetas[0].length > 3 ? ` ${etiquetas[0]}` : '';
  return (base + extra).slice(0, 60);
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

async function pixabay(opts: Opts): Promise<FotoDescargada | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  const url =
    'https://pixabay.com/api/?image_type=photo&orientation=horizontal&safesearch=true&lang=es&per_page=6&key=' +
    encodeURIComponent(key) +
    '&q=' +
    encodeURIComponent(opts.query);
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

async function pexels(opts: Opts): Promise<FotoDescargada | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const url =
    'https://api.pexels.com/v1/search?orientation=landscape&per_page=6&query=' +
    encodeURIComponent(opts.query);
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
  query: string;
  destinoAbsSinExt: string;
  slug: string;
  altBase: string;
}

/** Descarga una foto con licencia al destino indicado (Pixabay primero, luego Pexels). */
export async function descargarFoto(opts: Opts): Promise<FotoDescargada | null> {
  try {
    return (await pixabay(opts)) ?? (await pexels(opts));
  } catch {
    return null;
  }
}
