/**
 * Cálculos de las calculadoras de hipoteca y de ahorro. Funciones puras, sin DOM,
 * para poder probarlas con Vitest y reutilizarlas en el navegador.
 */

export interface ResultadoHipoteca {
  cuota: number;
  totalIntereses: number;
  totalPagado: number;
  /** Capital pendiente al final de cada año (índice 0 = tras el año 1). */
  pendientePorAnio: number[];
}

/** Cuota mensual de un préstamo con sistema francés (cuota constante). */
export function calcularHipoteca(capital: number, tinAnual: number, anios: number): ResultadoHipoteca {
  const n = Math.round(anios * 12);
  if (!(capital > 0) || n <= 0) return { cuota: 0, totalIntereses: 0, totalPagado: 0, pendientePorAnio: [] };
  const i = Math.max(0, tinAnual) / 100 / 12;
  const cuota = i === 0 ? capital / n : (capital * i) / (1 - Math.pow(1 + i, -n));

  const pendientePorAnio: number[] = [];
  let pendiente = capital;
  for (let mes = 1; mes <= n; mes++) {
    pendiente = pendiente * (1 + i) - cuota;
    if (mes % 12 === 0 || mes === n) pendientePorAnio.push(Math.max(0, pendiente));
  }
  const totalPagado = cuota * n;
  return { cuota, totalIntereses: totalPagado - capital, totalPagado, pendientePorAnio };
}

/** Cuota máxima recomendable: el 35 % de los ingresos netos mensuales. */
export function cuotaMaximaRecomendable(ingresosNetosMensuales: number, porcentaje = 35): number {
  return Math.max(0, (ingresosNetosMensuales * porcentaje) / 100);
}

export interface ResultadoAhorro {
  capitalFinal: number;
  aportado: number;
  intereses: number;
  /** Capital acumulado al final de cada año (índice 0 = año 1). */
  porAnio: { anio: number; capital: number; aportado: number }[];
}

/** Ahorro con interés compuesto mensual y aportación mensual (al final de cada mes). */
export function calcularAhorro(
  inicial: number,
  aportacionMensual: number,
  taeAnual: number,
  anios: number,
): ResultadoAhorro {
  const meses = Math.round(anios * 12);
  const ini = Math.max(0, inicial);
  const apo = Math.max(0, aportacionMensual);
  // TAE -> tipo mensual equivalente.
  const i = Math.pow(1 + Math.max(0, taeAnual) / 100, 1 / 12) - 1;

  let capital = ini;
  let aportado = ini;
  const porAnio: ResultadoAhorro['porAnio'] = [];
  for (let mes = 1; mes <= meses; mes++) {
    capital = capital * (1 + i) + apo;
    aportado += apo;
    if (mes % 12 === 0 || mes === meses) porAnio.push({ anio: Math.ceil(mes / 12), capital, aportado });
  }
  return { capitalFinal: capital, aportado, intereses: capital - aportado, porAnio };
}
