/**
 * Cálculos de una hipoteca con cuota constante (sistema francés), el que usan casi
 * todos los préstamos hipotecarios en España.
 */
export interface DatosHipoteca {
  capital: number; // € prestados
  anos: number; // plazo en años
  tipoAnual: number; // TIN en % (en variable: Euríbor + diferencial)
}

export interface FilaAnual {
  ano: number;
  intereses: number;
  amortizado: number;
  pendiente: number;
}

export interface ResultadoHipoteca {
  cuota: number;
  totalPagado: number;
  totalIntereses: number;
  porAno: FilaAnual[];
}

/** Cuota mensual del sistema francés. Con tipo 0, capital / meses. */
export function cuotaMensual(capital: number, anos: number, tipoAnual: number): number {
  const n = Math.round(anos * 12);
  if (capital <= 0 || n <= 0) return 0;
  const i = tipoAnual / 100 / 12;
  if (i === 0) return capital / n;
  return (capital * i) / (1 - Math.pow(1 + i, -n));
}

export function calcularHipoteca(d: DatosHipoteca): ResultadoHipoteca {
  const cuota = cuotaMensual(d.capital, d.anos, d.tipoAnual);
  const n = Math.round(d.anos * 12);
  const i = d.tipoAnual / 100 / 12;
  let pendiente = d.capital;
  const porAno: FilaAnual[] = [];
  let intAno = 0;
  let amAno = 0;
  let totalIntereses = 0;
  for (let m = 1; m <= n; m++) {
    const interes = pendiente * i;
    const amort = Math.min(pendiente, cuota - interes);
    pendiente -= amort;
    intAno += interes;
    amAno += amort;
    totalIntereses += interes;
    if (m % 12 === 0 || m === n) {
      porAno.push({ ano: Math.ceil(m / 12), intereses: intAno, amortizado: amAno, pendiente: Math.max(0, pendiente) });
      intAno = 0;
      amAno = 0;
    }
  }
  return { cuota, totalPagado: cuota * n, totalIntereses, porAno };
}

/** % de los ingresos netos mensuales que se va en la cuota. */
export function esfuerzo(cuota: number, ingresosNetosMes: number): number {
  return ingresosNetosMes > 0 ? (cuota / ingresosNetosMes) * 100 : 0;
}
