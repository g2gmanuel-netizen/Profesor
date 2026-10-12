import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

const FuenteConfigSchema = z.object({
  nombre: z.string(),
  organismo: z.string(),
  tipo: z.enum(['oficial', 'datos_abiertos', 'tendencia']),
  prioridad: z.number().int().min(1).max(3),
  rss: z.string().url().optional(),
  web: z.string().url().optional(),
});
export type FuenteConfig = z.infer<typeof FuenteConfigSchema>;

const ConfigFuentesSchema = z.object({
  fuentes: z.array(FuenteConfigSchema),
  palabras_clave: z.array(z.string()).default([]),
});
export type ConfigFuentes = z.infer<typeof ConfigFuentesSchema>;

export function cargarFuentes(): ConfigFuentes {
  const ruta = resolve(process.cwd(), 'agentes/config/fuentes.yaml');
  const crudo = parse(readFileSync(ruta, 'utf8'));
  return ConfigFuentesSchema.parse(crudo);
}

export interface ItemFeed {
  titulo: string;
  enlace: string;
  resumen: string;
  fecha: string;
}

/** Descarga el texto de una URL con timeout; devuelve null si falla (sin romper). */
export async function descargarTexto(url: string, timeoutMs = 8000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'BolsilloDiarioBot/1.0' } });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Comprueba que un feed responde; devuelve los items o null si falla (sin romper). */
export async function leerFeed(url: string, timeoutMs = 8000): Promise<ItemFeed[] | null> {
  const xml = await descargarTexto(url, timeoutMs);
  return xml === null ? null : parsearRss(xml);
}

export interface TendenciaTermino {
  termino: string;
  /** Tráfico aproximado que da Google Trends (p. ej. "50 mil+"), si viene. */
  trafico?: string;
}

/**
 * Lo que la gente está buscando AHORA MISMO en España (Google Trends, búsquedas
 * del día). Es la señal de "trending topic" más fiable y gratuita. Prueba varios
 * endpoints por si alguno cambia; devuelve [] si ninguno responde (nunca rompe).
 */
export async function obtenerTendenciasEspana(timeoutMs = 8000): Promise<TendenciaTermino[]> {
  const urls = [
    'https://trends.google.com/trending/rss?geo=ES',
    'https://trends.google.es/trending/rss?geo=ES',
    'https://trends.google.com/trends/trendingsearches/daily/rss?geo=ES',
  ];
  for (const url of urls) {
    const xml = await descargarTexto(url, timeoutMs);
    if (!xml) continue;
    const terminos = parsearTendenciasGoogle(xml);
    if (terminos.length > 0) return terminos;
  }
  return [];
}

/** Extrae los términos de tendencia (y su tráfico) del RSS de Google Trends. */
export function parsearTendenciasGoogle(xml: string): TendenciaTermino[] {
  const out: TendenciaTermino[] = [];
  const bloques = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];
  for (const b of bloques) {
    const mt =
      b.match(/<title>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/title>/) ??
      b.match(/<title>([\s\S]*?)<\/title>/);
    const termino = mt ? limpiarHtml(mt[1]!) : '';
    if (!termino) continue;
    const mtr = b.match(/<ht:approx_traffic>\s*([\s\S]*?)\s*<\/ht:approx_traffic>/);
    out.push({ termino, trafico: mtr ? mtr[1]!.trim() : undefined });
  }
  return out;
}

/** Parser RSS/Atom mínimo sin dependencias. */
export function parsearRss(xml: string): ItemFeed[] {
  const items: ItemFeed[] = [];
  const bloques = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/g) ?? [];
  for (const b of bloques) {
    const campo = (tag: string): string => {
      const m =
        b.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`)) ??
        b.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? m[1]!.trim() : '';
    };
    let enlace = campo('link');
    if (!enlace) {
      const m = b.match(/<link[^>]*href="([^"]+)"/);
      enlace = m ? m[1]! : '';
    }
    items.push({
      titulo: limpiarHtml(campo('title')),
      enlace,
      resumen: limpiarHtml(campo('description') || campo('summary')),
      fecha: campo('pubDate') || campo('updated') || campo('published'),
    });
  }
  return items;
}

function limpiarHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
