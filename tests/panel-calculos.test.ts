import { describe, it, expect } from 'vitest';
import {
  rpm,
  arpu,
  beneficio,
  margen,
  costePorArticulo,
  puntoEquilibrio,
  roi,
  prorrateoDiario,
  repartoIngresosPorArticulo,
  proyeccionCierreMes,
} from '../panel/src/lib/calculos';

describe('cálculos financieros del panel', () => {
  it('RPM = ingresos / pv * 1000', () => {
    expect(rpm(20, 10000)).toBe(2);
    expect(rpm(5, 0)).toBe(0);
  });

  it('ARPU = ingresos / usuarios', () => {
    expect(arpu(100, 500)).toBe(0.2);
    expect(arpu(100, 0)).toBe(0);
  });

  it('beneficio = ingresos - (IA + fijos)', () => {
    expect(beneficio(100, 20, 30)).toBe(50);
  });

  it('margen en %', () => {
    expect(margen(100, 60)).toBeCloseTo(40);
    expect(margen(0, 10)).toBe(0);
  });

  it('coste por artículo', () => {
    expect(costePorArticulo(90, 9)).toBe(10);
    expect(costePorArticulo(90, 0)).toBe(0);
  });

  it('punto de equilibrio en páginas vistas', () => {
    // costes 100 €, RPM 2 € => 50.000 pv
    expect(puntoEquilibrio(100, 2)).toBe(50000);
    expect(puntoEquilibrio(100, 0)).toBe(Infinity);
  });

  it('ROI acumulado', () => {
    expect(roi(150, 100)).toBeCloseTo(50);
    expect(roi(100, 0)).toBe(0);
  });

  it('prorrateo diario', () => {
    expect(prorrateoDiario(30, 'mensual')).toBe(1);
    expect(prorrateoDiario(365, 'anual')).toBe(1);
  });

  it('reparto de ingresos por artículo según pv', () => {
    const r = repartoIngresosPorArticulo(2, { a: 1000, b: 500 });
    expect(r.a).toBe(2);
    expect(r.b).toBe(1);
  });

  it('proyección de cierre de mes', () => {
    // 100 € en 10 días => 300 € a 30 días
    expect(proyeccionCierreMes(100, 10, 30)).toBe(300);
    expect(proyeccionCierreMes(100, 0, 30)).toBe(0);
  });
});
