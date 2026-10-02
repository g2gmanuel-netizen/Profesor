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

/** Comprueba que un feed responde; devuelve los items o null si falla (sin romper). */
export async function leerFeed(url: string, timeoutMs = 8000): Promise<ItemFeed[] | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'BolsilloDiarioBot/1.0' } });
    if (!r.ok) return null;
    const xml = await r.text();
    return parsearRss(xml);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
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
