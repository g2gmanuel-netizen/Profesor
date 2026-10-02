import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

// Raíz del repositorio: este archivo está en panel/src/lib/datos.ts
const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../..');

export const DEMO =
  process.env.PANEL_DEMO === '1' || process.env.PANEL_DEMO === 'true';

const DIR_DATOS = DEMO ? resolve(RAIZ, 'datos/ejemplo') : resolve(RAIZ, 'datos/metricas');

/** Lee el JSON de métrica más reciente de una fuente (o el archivo fijo en modo demo). */
function leerFuente<T = Record<string, unknown>>(fuente: string): T | null {
  if (DEMO) {
    const ruta = resolve(DIR_DATOS, `${fuente}.json`);
    if (!existsSync(ruta)) return null;
    try {
      return JSON.parse(readFileSync(ruta, 'utf8')) as T;
    } catch {
      return null;
    }
  }
  // En producción buscamos el archivo con fecha más reciente: fuente-YYYY-MM-DD.json
  if (!existsSync(DIR_DATOS)) return null;
  const archivos = readdirSync(DIR_DATOS)
    .filter((f) => f.startsWith(`${fuente}-`) && f.endsWith('.json'))
    .sort()
    .reverse();
  if (archivos.length === 0) return null;
  try {
    return JSON.parse(readFileSync(resolve(DIR_DATOS, archivos[0]!), 'utf8')) as T;
  } catch {
    return null;
  }
}

function leerYaml<T = Record<string, unknown>>(rutaRelativa: string): T | null {
  const ruta = resolve(RAIZ, rutaRelativa);
  if (!existsSync(ruta)) return null;
  try {
    return parse(readFileSync(ruta, 'utf8')) as T;
  } catch {
    return null;
  }
}

export interface DiaGa4 {
  fecha: string;
  usuarios: number;
  sesiones: number;
  paginasVistas: number;
  duracionMediaS: number;
  nuevos?: number;
  recurrentes?: number;
}
export interface Ga4 {
  estado: string;
  dias: DiaGa4[];
  fuentesTrafico?: Record<string, number>;
  dispositivos?: Record<string, number>;
  topArticulos?: { slug: string; titulo: string; paginasVistas: number }[];
}
export interface Adsense {
  estado: string;
  ingresos30d?: number;
  rpm?: number;
  paginasVistasMonetizadas?: number;
  impresiones?: number;
  clics?: number;
  ctr?: number;
  dias?: { fecha: string; ingresos: number }[];
}
export interface SearchConsole {
  estado: string;
  discover?: { clics: number; impresiones: number };
  consultas?: { consulta: string; clics: number; impresiones: number; ctr: number; posicion: number }[];
}
export interface Agentes {
  estado: string;
  ultimaEjecucion?: { inicio: string; timeline: { agente: string; inicio: string; duracionMs: number; estado: string; costeUsd: number }[] };
  kanban?: { articulo: string; fase: string }[];
  porAgente?: { agente: string; ejecuciones: number; exitoPct: number; rechazoPct: number; costeUsd: number; motivosFrecuentes: string[] }[];
  errores?: { fecha: string; agente: string; mensaje: string; log: string }[];
}
export interface CostesIa {
  estado: string;
  dias?: Record<string, { costeUsd: number }>;
}
export interface CostesFijos {
  estado: string;
  moneda?: string;
  conceptos?: { concepto: string; importe: number; periodicidad: 'mensual' | 'anual' }[];
}
export interface Supuestos {
  rpm_hipotetico_eur: number;
  tipo_cambio_usd_eur: number;
  crecimiento_mensual_pct: number;
}

export function cargarDatos() {
  return {
    demo: DEMO,
    ga4: leerFuente<Ga4>('ga4'),
    adsense: leerFuente<Adsense>('adsense'),
    searchConsole: leerFuente<SearchConsole>('search-console'),
    agentes: leerFuente<Agentes>('agentes'),
    costesIa: leerFuente<CostesIa>('costes-ia'),
    costesFijos: DEMO
      ? leerFuente<CostesFijos>('costes-fijos')
      : (leerYaml<CostesFijos>('datos/costes_fijos.yaml') ?? { estado: 'pendiente' }),
    supuestos:
      leerYaml<Supuestos>('datos/supuestos.yaml') ??
      ({ rpm_hipotetico_eur: 4, tipo_cambio_usd_eur: 0.92, crecimiento_mensual_pct: 15 } as Supuestos),
  };
}

export type DatosPanel = ReturnType<typeof cargarDatos>;

export function eur(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}
export function numero(n: number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(n);
}
export function pct(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 }).format(n);
}
