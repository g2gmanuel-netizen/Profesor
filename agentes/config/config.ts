import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Carga mínima de .env (sin dependencias) si existe, sin sobrescribir variables ya definidas. */
function cargarEnv(): void {
  const ruta = resolve(process.cwd(), '.env');
  if (!existsSync(ruta)) return;
  const contenido = readFileSync(ruta, 'utf8');
  for (const linea of contenido.split('\n')) {
    const l = linea.trim();
    if (!l || l.startsWith('#')) continue;
    const i = l.indexOf('=');
    if (i === -1) continue;
    const clave = l.slice(0, i).trim();
    let valor = l.slice(i + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    if (process.env[clave] === undefined) process.env[clave] = valor;
  }
}
cargarEnv();

function num(nombre: string, porDefecto: number): number {
  const v = process.env[nombre];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : porDefecto;
}

export const CONFIG = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  modeloRedaccion: process.env.MODELO_REDACCION ?? 'claude-opus-4-8',
  modeloRapido: process.env.MODELO_RAPIDO ?? 'claude-haiku-4-5',
  presupuestoDiarioUsd: num('PRESUPUESTO_DIARIO_USD', 3),
  revisionHumana: (process.env.REVISION_HUMANA ?? 'true') !== 'false',
  articulosMinDia: num('ARTICULOS_MIN_DIA', 3),
  articulosMaxDia: num('ARTICULOS_MAX_DIA', 6),
  autor: process.env.AUTOR_RESPONSABLE ?? 'Manuel González',
} as const;

/**
 * Precio aproximado por millón de tokens (USD), para el contador de costes.
 * Ajusta estos valores si cambias de modelo; sirven de estimación, no de factura.
 */
// Precios por millón de tokens (USD). Referencia: tarifas API de Anthropic (2026).
// Son estimación para el contador de costes, no una factura; ajústalos si cambian.
export const PRECIOS: Record<string, { entrada: number; salida: number }> = {
  'claude-opus-5-5': { entrada: 4, salida: 20 },
  'claude-opus-4-8': { entrada: 5, salida: 25 },
  'claude-sonnet-5-5': { entrada: 2, salida: 10 },
  'claude-haiku-4-5': { entrada: 1, salida: 5 },
};

export function precioModelo(modelo: string): { entrada: number; salida: number } {
  return PRECIOS[modelo] ?? { entrada: 3, salida: 15 };
}
