/**
 * Cálculos financieros del panel. Funciones puras y testeables.
 * Todas las cifras monetarias en euros salvo que se indique.
 */

/** RPM: ingresos por cada 1.000 páginas vistas. */
export function rpm(ingresos: number, paginasVistas: number): number {
  if (paginasVistas <= 0) return 0;
  return (ingresos / paginasVistas) * 1000;
}

/** ARPU: ingreso medio por usuario único. */
export function arpu(ingresos: number, usuarios: number): number {
  if (usuarios <= 0) return 0;
  return ingresos / usuarios;
}

export function beneficio(ingresos: number, costeIa: number, costesFijos: number): number {
  return ingresos - (costeIa + costesFijos);
}

/** Margen en % sobre ingresos. */
export function margen(ingresos: number, costeTotal: number): number {
  if (ingresos <= 0) return 0;
  return ((ingresos - costeTotal) / ingresos) * 100;
}

export function costePorArticulo(costeTotal: number, numeroArticulos: number): number {
  if (numeroArticulos <= 0) return 0;
  return costeTotal / numeroArticulos;
}

export function ingresoPorArticulo(ingresos: number, numeroArticulos: number): number {
  if (numeroArticulos <= 0) return 0;
  return ingresos / numeroArticulos;
}

export function costePorUsuario(costeTotal: number, usuarios: number): number {
  if (usuarios <= 0) return 0;
  return costeTotal / usuarios;
}

/**
 * Punto de equilibrio: páginas vistas mensuales necesarias para cubrir los costes
 * con el RPM actual. (costes / RPM) * 1000.
 */
export function puntoEquilibrio(costesMensuales: number, rpmActual: number): number {
  if (rpmActual <= 0) return Infinity;
  return (costesMensuales / rpmActual) * 1000;
}

/** ROI acumulado en % = (ingresos - costes) / costes * 100. */
export function roi(ingresosAcumulados: number, costesAcumulados: number): number {
  if (costesAcumulados <= 0) return 0;
  return ((ingresosAcumulados - costesAcumulados) / costesAcumulados) * 100;
}

/** Prorrateo diario de un coste fijo según su periodicidad. */
export function prorrateoDiario(importe: number, periodicidad: 'mensual' | 'anual'): number {
  if (periodicidad === 'anual') return importe / 365;
  return importe / 30;
}

/**
 * Reparte los ingresos del periodo entre artículos según sus páginas vistas:
 * ingreso_articulo = RPM_sitio * pv_articulo / 1000 (estimación).
 */
export function repartoIngresosPorArticulo(
  rpmSitio: number,
  paginasVistasPorArticulo: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, pv] of Object.entries(paginasVistasPorArticulo)) {
    out[id] = (rpmSitio * pv) / 1000;
  }
  return out;
}

/**
 * Proyección de cierre de mes: extrapola la media diaria de los últimos días
 * al total de días del mes.
 */
export function proyeccionCierreMes(
  acumuladoMes: number,
  diasTranscurridos: number,
  diasDelMes: number,
): number {
  if (diasTranscurridos <= 0) return 0;
  const mediaDiaria = acumuladoMes / diasTranscurridos;
  return mediaDiaria * diasDelMes;
}

export function conversionDivisa(importe: number, tipoCambio: number): number {
  return importe * tipoCambio;
}
