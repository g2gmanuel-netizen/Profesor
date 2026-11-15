/**
 * Comparador de sueldos: sitúa un salario bruto dentro de la distribución de los
 * asalariados en España.
 *
 * Fuente: INE, «Decil de salarios del empleo principal. Encuesta de Población Activa (EPA).
 * Año 2024» (publicada en noviembre de 2025). Salario bruto mensual del empleo principal,
 * con las pagas extra prorrateadas. Es decir: bruto anual / 12.
 *
 * El INE publica los cortes de los deciles. Aquí se usan los seis que hemos podido
 * contrastar; entre dos cortes conocidos se interpola en línea recta, por lo que el
 * resultado es una estimación (suficiente para saber en qué zona estás).
 */
export const ANIO_DATOS = 2024;

/** [porcentaje de asalariados que gana menos, euros brutos al mes] */
export const CORTES: ReadonlyArray<readonly [number, number]> = [
  [10, 1068.9],
  [30, 1582.2],
  [50, 2001.4],
  [70, 2659.8],
  [80, 3199.8],
  [90, 4056.7],
];

export const MEDIA_MENSUAL = 2385.6;
export const MEDIANA_MENSUAL = 2001.4;
export const MEDIA_MUJERES = 2163.2;
export const MEDIA_HOMBRES = 2593.0;
export const MEDIA_MENORES_25 = 1372.8;
export const MEDIA_55_O_MAS = 2680.7;
/** Promesa del PP en el debate electoral del 13-11-2026: salario medio de 50.000 € brutos al año. */
export const PROMESA_ANUAL = 50000;

export interface ResultadoSueldo {
  mensual: number;
  anual: number;
  /** Porcentaje aproximado de asalariados que gana menos que tú (10–90), o null en los extremos. */
  percentil: number | null;
  /** 'bajo' = en el 10 % que menos gana; 'alto' = en el 10 % que más gana. */
  extremo: 'bajo' | 'alto' | null;
  /** Diferencia con el salario medio, en euros al mes (positivo = por encima). */
  difMedia: number;
  /** Diferencia con el salario mediano, en euros al mes. */
  difMediana: number;
  /** Lo que falta (o sobra, si es negativo) al año para llegar a 50.000 €. */
  faltaPromesa: number;
}

export function compararSueldo(brutoAnual: number): ResultadoSueldo {
  const anual = Math.max(0, brutoAnual);
  const mensual = anual / 12;
  let percentil: number | null = null;
  let extremo: 'bajo' | 'alto' | null = null;
  const primero = CORTES[0]!;
  const ultimo = CORTES[CORTES.length - 1]!;
  if (mensual < primero[1]) extremo = 'bajo';
  else if (mensual >= ultimo[1]) extremo = 'alto';
  else {
    for (let i = 0; i < CORTES.length - 1; i++) {
      const [p0, e0] = CORTES[i]!;
      const [p1, e1] = CORTES[i + 1]!;
      if (mensual >= e0 && mensual < e1) {
        percentil = Math.round(p0 + ((mensual - e0) / (e1 - e0)) * (p1 - p0));
        break;
      }
    }
  }
  return {
    mensual,
    anual,
    percentil,
    extremo,
    difMedia: mensual - MEDIA_MENSUAL,
    difMediana: mensual - MEDIANA_MENSUAL,
    faltaPromesa: PROMESA_ANUAL - anual,
  };
}
