import { writeFileSync } from 'node:fs';

/**
 * Búsqueda y descarga de fotos con licencia de Pexels (uso comercial permitido).
 * Si no hay PEXELS_API_KEY o algo falla, devuelve null y el sistema usa la portada
 * propia de color como alternativa. Nunca usa imágenes con derechos de autor.
 */

export interface FotoDescargada {
  rutaPublica: string; // p.ej. /imagenes/slug.jpg
  credito: string; // "Foto: Autor (Pexels)"
  alt: string;
}

/** Términos de búsqueda por sección, para fotos relevantes y sobrias. */
const QUERY_SECCION: Record<string, string> = {
  actualidad: 'periódico noticias españa',
  politica: 'parlamento gobierno congreso',
  sociedad: 'gente ciudad españa',
  vivienda: 'edificio vivienda ciudad',
  hipotecas: 'casa llaves hipoteca',
  alquiler: 'piso apartamento alquiler',
  ahorro: 'ahorro monedas euros',
  impuestos: 'documentos calculadora impuestos',
  pensiones: 'persona mayor jubilación',
  precios: 'supermercado compra cesta',
};

export function queryParaArticulo(categoria: string, etiquetas: string[] = []): string {
  const base = QUERY_SECCION[categoria] ?? 'españa actualidad';
  const extra = etiquetas[0] && etiquetas[0].length > 3 ? ` ${etiquetas[0]}` : '';
  return (base + extra).slice(0, 60);
}

/**
 * Busca en Pexels y descarga la primera foto horizontal al destino indicado.
 * @param destinoAbsSinExt ruta absoluta en disco SIN extensión (se añade .jpg)
 * @param slug identificador para construir la ruta pública
 */
export async function descargarFotoPexels(opts: {
  query: string;
  apiKey: string;
  destinoAbsSinExt: string;
  slug: string;
  altBase: string;
}): Promise<FotoDescargada | null> {
  if (!opts.apiKey) return null;
  try {
    const url =
      'https://api.pexels.com/v1/search?orientation=landscape&per_page=6&query=' +
      encodeURIComponent(opts.query);
    const r = await fetch(url, { headers: { Authorization: opts.apiKey } });
    if (!r.ok) return null;
    const data = (await r.json()) as {
      photos?: {
        src?: { landscape?: string; large?: string };
        photographer?: string;
        alt?: string;
      }[];
    };
    const foto = data.photos?.[0];
    const imgUrl = foto?.src?.landscape ?? foto?.src?.large;
    if (!foto || !imgUrl) return null;

    const ir = await fetch(imgUrl);
    if (!ir.ok) return null;
    const buf = Buffer.from(await ir.arrayBuffer());
    writeFileSync(`${opts.destinoAbsSinExt}.jpg`, buf);

    const autor = foto.photographer ?? 'Pexels';
    return {
      rutaPublica: `/imagenes/${opts.slug}.jpg`,
      credito: `Foto: ${autor} (Pexels)`,
      alt: foto.alt && foto.alt.length > 5 ? foto.alt : opts.altBase,
    };
  } catch {
    return null;
  }
}
