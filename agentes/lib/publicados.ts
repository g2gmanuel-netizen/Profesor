import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { similitud } from './util';

const ARCHIVO = resolve(process.cwd(), 'datos/publicados.json');

export interface TemaPublicado {
  id: string;
  titulo: string;
  slug: string;
  categoria: string;
  fecha: string;
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

/** ¿Ya hemos publicado algo muy parecido? Comparación semántica por solapamiento de tokens. */
export function yaPublicado(
  titulo: string,
  publicados: TemaPublicado[],
  umbral = 0.6,
): boolean {
  return publicados.some((p) => similitud(titulo, p.titulo) >= umbral);
}
