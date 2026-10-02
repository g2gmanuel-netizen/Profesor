import type { DatosPanel } from './datos';
import {
  rpm,
  arpu,
  beneficio,
  margen,
  puntoEquilibrio,
  roi,
  prorrateoDiario,
  proyeccionCierreMes,
  conversionDivisa,
} from './calculos';

export interface ResumenPeriodo {
  usuarios: number;
  paginasVistas: number;
  ingresos: number;
  costeIa: number;
  costesFijos: number;
  beneficio: number;
  margenPct: number;
  rpm: number;
  arpu: number;
  ingresosEstimados: boolean;
}

function ultimosNDias<T extends { fecha: string }>(dias: T[], n: number): T[] {
  return [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-n);
}

/** Coste fijo total prorrateado al número de días indicado. */
export function costesFijosProrrateados(datos: DatosPanel, dias: number): number {
  const conceptos = datos.costesFijos?.conceptos ?? [];
  let porDia = 0;
  for (const c of conceptos) porDia += prorrateoDiario(c.importe, c.periodicidad);
  return porDia * dias;
}

export function resumenPeriodo(datos: DatosPanel, dias: number): ResumenPeriodo {
  const ga4Dias = ultimosNDias(datos.ga4?.dias ?? [], dias);
  const usuarios = ga4Dias.reduce((a, d) => a + d.usuarios, 0);
  const paginasVistas = ga4Dias.reduce((a, d) => a + d.paginasVistas, 0);

  // Ingresos: reales de AdSense si está aprobado; si no, estimación con RPM hipotético.
  const adsenseOk = datos.adsense?.estado === 'ok' && (datos.adsense?.ingresos30d ?? 0) > 0;
  let ingresos: number;
  let ingresosEstimados: boolean;
  if (adsenseOk && datos.adsense?.dias) {
    const adsDias = ultimosNDias(datos.adsense.dias, dias);
    ingresos = adsDias.reduce((a, d) => a + d.ingresos, 0);
    ingresosEstimados = false;
  } else {
    ingresos = (paginasVistas * datos.supuestos.rpm_hipotetico_eur) / 1000;
    ingresosEstimados = true;
  }

  // Coste de IA del periodo (USD → EUR).
  const costesIaDias = datos.costesIa?.dias ?? {};
  const costeIaUsd = Object.entries(costesIaDias)
    .filter(([f]) => ga4Dias.some((d) => d.fecha === f))
    .reduce((a, [, v]) => a + (v?.costeUsd ?? 0), 0);
  const costeIa = conversionDivisa(costeIaUsd, datos.supuestos.tipo_cambio_usd_eur);

  const fijos = costesFijosProrrateados(datos, dias);
  const costeTotal = costeIa + fijos;

  return {
    usuarios,
    paginasVistas,
    ingresos,
    costeIa,
    costesFijos: fijos,
    beneficio: beneficio(ingresos, costeIa, fijos),
    margenPct: margen(ingresos, costeTotal),
    rpm: rpm(ingresos, paginasVistas),
    arpu: arpu(ingresos, usuarios),
    ingresosEstimados,
  };
}

export interface KpisFinancieros {
  rpm: number;
  arpu: number;
  puntoEquilibrioPv: number;
  roiPct: number;
  proyeccionIngresosMes: number;
  proyeccionBeneficioMes: number;
}

export function kpisFinancieros(datos: DatosPanel): KpisFinancieros {
  const mes = resumenPeriodo(datos, 30);
  const costesMensuales = mes.costeIa + mes.costesFijos;
  const diasConDatos = (datos.ga4?.dias ?? []).length || 1;

  return {
    rpm: mes.rpm,
    arpu: mes.arpu,
    puntoEquilibrioPv: puntoEquilibrio(costesMensuales, mes.rpm),
    roiPct: roi(mes.ingresos, costesMensuales),
    proyeccionIngresosMes: proyeccionCierreMes(mes.ingresos, diasConDatos, 30),
    proyeccionBeneficioMes: proyeccionCierreMes(mes.beneficio, diasConDatos, 30),
  };
}

/** Semáforo de salud del negocio. */
export function semaforo(datos: DatosPanel): 'verde' | 'ambar' | 'rojo' {
  const mes = resumenPeriodo(datos, 30);
  if (mes.beneficio > 0) return 'verde';
  if (mes.ingresos > 0) return 'ambar';
  return 'rojo';
}
