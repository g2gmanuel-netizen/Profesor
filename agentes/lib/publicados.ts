import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parse } from 'yaml';
import { similitud, solapamiento, tokens } from './util';

const ARCHIVO = resolve(process.cwd(), 'datos/publicados.json');
const DIR_ART = resolve(process.cwd(), 'src/content/articulos');

export interface TemaPublicado {
  id: string;
  titulo: string;
  slug: string;
  categoria: string;
  fecha: string;
  /** URLs de las fuentes del artículo (misma fuente = misma noticia). */
  urls?: string[];
}

interface ArchivoPublicados {
  temas: TemaPublicado[];
}

export function cargarPublicados(): ArchivoPublicados {
  if (existsSync(ARCHIVO)) {
    try {
      return JSON.parse(readFileSync(ARCHIVO, 'utf8')) as ArchivoPublicados;
    } catch {
      /* corrupto */
    }
  }
  return { temas: [] };
}

export function guardarPublicados(datos: ArchivoPublicados): void {
  mkdirSync(dirname(ARCHIVO), { recursive: true });
  writeFileSync(ARCHIVO, JSON.stringify(datos, null, 2), 'utf8');
}

/**
 * Normaliza una URL para compararla (sin protocolo, www, parámetros ni barra final).
 * Los enlaces de Google News codifican la misma noticia con pequeñas variaciones al
 * final, así que de ellos nos quedamos con el principio del identificador.
 */
export function normalizarUrl(u: string): string {
  const n = u
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
  const gn = n.match(/^news\.google\.com\/(?:rss\/)?articles\/([A-Za-z0-9_-]+)/i);
  if (gn) return `gnews:${gn[1]!.slice(0, 120)}`;
  return n.toLowerCase();
}

/** Palabras de plantilla de nuestros titulares que no identifican el tema. */
const PLANTILLA = new Set([
  'que', 'significa', 'puedes', 'hacer', 'saber', 'claves', 'clave', 'como', 'cuanto', 'cuando',
  'cambia', 'para', 'ti', 'tu', 'tus', 'esto', 'debes', 'tienes', 'caso', 'real', 'guia', 'pasos',
  'por', 'porque', 'afecta', 'sabe', 'explicado', 'todo', 'nuevo', 'nueva', 'nuevos', 'nuevas',
  'espana', 'espanol', 'espanola', 'hoy', 'ahora', 'mas', 'menos', 'segun', 'dato', 'datos',
]);

/** Singular aproximado para que «pensión» y «pensiones» cuenten como la misma palabra. */
const raiz = (t: string) => (t.length > 4 ? t.replace(/(es|s)$/, '') : t);

function tokensTema(s: string): string[] {
  // Las cifras cortas (65 %, 1.700 €) identifican mucho la noticia: se conservan aparte.
  const cifras = (s.replace(/(\d)[.,](\d{3})/g, '$1$2').match(/\d{2,}/g) ?? []).map((n) => `#${n}`);
  return [...new Set([...tokens(s).filter((t) => !PLANTILLA.has(t) && !/^\d+$/.test(t)).map(raiz), ...cifras])];
}

/** URLs genéricas (portadas de medios) que no identifican una noticia concreta. */
function esUrlGenerica(u: string): boolean {
  const n = normalizarUrl(u);
  if (n.startsWith('gnews:')) return false;
  return !n.includes('/') || n.split('/').filter(Boolean).length < 2;
}

/**
 * Historial completo de lo publicado: datos/publicados.json + los artículos que
 * existen de verdad en la web (por si alguno entró por otra vía). Incluye las URLs
 * de las fuentes de cada artículo.
 */
export function cargarHistorial(): TemaPublicado[] {
  const porSlug = new Map<string, TemaPublicado>();
  for (const t of cargarPublicados().temas) porSlug.set(t.slug, { ...t, urls: t.urls ?? [] });

  if (existsSync(DIR_ART)) {
    for (const f of readdirSync(DIR_ART)) {
      if (!/\.(md|mdx)$/.test(f)) continue;
      const slug = f.replace(/\.(md|mdx)$/, '');
      const m = readFileSync(resolve(DIR_ART, f), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!m) continue;
      let fm: Record<string, unknown> = {};
      try {
        fm = (parse(m[1]!) as Record<string, unknown>) ?? {};
      } catch {
        continue;
      }
      const urls = Array.isArray(fm.fuentes)
        ? (fm.fuentes as { url?: unknown }[]).map((x) => String(x?.url ?? '')).filter(Boolean)
        : [];
      const previo = porSlug.get(slug);
      porSlug.set(slug, {
        id: previo?.id ?? slug,
        slug,
        titulo: String(fm.titulo ?? previo?.titulo ?? slug),
        categoria: String(fm.categoria ?? previo?.categoria ?? ''),
        fecha: String(fm.fechaPublicacion ?? previo?.fecha ?? ''),
        urls: Array.from(new Set([...(previo?.urls ?? []), ...urls])),
      });
    }
  }
  return [...porSlug.values()].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

/**
 * ¿Es la misma noticia que algo ya publicado? Tres señales:
 *  1. Comparte URL de fuente concreta (no una portada genérica de un medio).
 *  2. Títulos muy parecidos (Jaccard ≥ 0,45).
 *  3. Mismos conceptos clave aunque el titular esté reformulado
 *     (≥ 3 palabras clave en común y solapamiento ≥ 0,5, o ≥ 0,3 si comparten una cifra).
 */
export function esDuplicado(
  titulo: string,
  url: string | undefined,
  historial: TemaPublicado[],
): TemaPublicado | undefined {
  const u = url && !esUrlGenerica(url) ? normalizarUrl(url) : '';
  const ta = tokensTema(titulo);
  return historial.find((p) => {
    if (u && (p.urls ?? []).some((x) => !esUrlGenerica(x) && normalizarUrl(x) === u)) return true;
    const tb = tokensTema(p.titulo);
    const a = ta.join(' ');
    const b = tb.join(' ');
    if (similitud(a, b) >= 0.45) return true;
    const comunes = new Set(tb.filter((t) => ta.includes(t)));
    if (comunes.size >= 3 && solapamiento(a, b) >= 0.5) return true;
    // Misma cifra concreta (65 %, 2027, 1.700 €…) y el mismo tema: es la misma noticia contada de otra forma.
    const cifra = [...comunes].some((t) => t.startsWith('#'));
    return cifra && comunes.size >= 3 && comunes.size / Math.min(ta.length, tb.length) >= 0.3;
  });
}

/** Compatibilidad: ¿ya hemos publicado algo muy parecido? */
export function yaPublicado(titulo: string, publicados: TemaPublicado[], url?: string): boolean {
  return Boolean(esDuplicado(titulo, url, publicados));
}

/** Lista breve de títulos recientes para que la IA no repita temas. */
export function resumenHistorial(historial: TemaPublicado[], n = 40): string {
  return historial
    .slice(0, n)
    .map((t) => `- ${t.titulo}`)
    .join('\n');
}
