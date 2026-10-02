import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { guardarMetrica } from './lib';

/** Recolector de coste de IA: lee datos/costes.json (contador del orquestador). */
export function recolectarCostesIa(): string {
  const ruta = resolve(process.cwd(), 'datos/costes.json');
  if (!existsSync(ruta)) {
    return guardarMetrica('costes-ia', { estado: 'ok', dias: {}, nota: 'Sin ejecuciones todavía.' });
  }
  const datos = JSON.parse(readFileSync(ruta, 'utf8'));
  return guardarMetrica('costes-ia', { estado: 'ok', ...datos });
}

/** Recolector de costes fijos: lee datos/costes_fijos.yaml. */
export function recolectarCostesFijos(): string {
  const ruta = resolve(process.cwd(), 'datos/costes_fijos.yaml');
  if (!existsSync(ruta)) {
    return guardarMetrica('costes-fijos', { estado: 'pendiente', conceptos: [] });
  }
  const datos = parse(readFileSync(ruta, 'utf8'));
  return guardarMetrica('costes-fijos', { estado: 'ok', ...datos });
}
