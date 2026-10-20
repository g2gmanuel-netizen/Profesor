import { describe, expect, it } from 'vitest';
import { calcularAhorro, calcularHipoteca, cuotaMaximaRecomendable } from '../src/lib/calculadoras-finanzas';

describe('calcularHipoteca', () => {
  it('cuadra con la cuota conocida de 150.000 € al 3 % a 25 años', () => {
    const r = calcularHipoteca(150000, 3, 25);
    expect(r.cuota).toBeCloseTo(711.34, 1);
    expect(r.totalPagado).toBeCloseTo(r.cuota * 300, 6);
    expect(r.totalIntereses).toBeCloseTo(r.totalPagado - 150000, 6);
  });

  it('al 0 % reparte el capital a partes iguales', () => {
    const r = calcularHipoteca(120000, 0, 10);
    expect(r.cuota).toBeCloseTo(1000, 6);
    expect(r.totalIntereses).toBeCloseTo(0, 6);
  });

  it('el capital pendiente termina en cero y decrece', () => {
    const r = calcularHipoteca(200000, 2.5, 30);
    expect(r.pendientePorAnio).toHaveLength(30);
    expect(r.pendientePorAnio[29]).toBeCloseTo(0, 4);
    expect(r.pendientePorAnio[0]!).toBeGreaterThan(r.pendientePorAnio[1]!);
  });

  it('entradas inválidas devuelven ceros', () => {
    expect(calcularHipoteca(0, 3, 25).cuota).toBe(0);
    expect(calcularHipoteca(100000, 3, 0).cuota).toBe(0);
  });
});

describe('cuotaMaximaRecomendable', () => {
  it('aplica el 35 % por defecto', () => {
    expect(cuotaMaximaRecomendable(2000)).toBeCloseTo(700, 6);
    expect(cuotaMaximaRecomendable(-5)).toBe(0);
  });
});

describe('calcularAhorro', () => {
  it('sin interés el capital es lo aportado', () => {
    const r = calcularAhorro(1000, 100, 0, 2);
    expect(r.capitalFinal).toBeCloseTo(3400, 6);
    expect(r.intereses).toBeCloseTo(0, 6);
  });

  it('un año con TAE 3 % sobre capital inicial da exactamente el 3 %', () => {
    const r = calcularAhorro(10000, 0, 3, 1);
    expect(r.capitalFinal).toBeCloseTo(10300, 4);
    expect(r.porAnio).toHaveLength(1);
  });

  it('el interés crece con el tiempo', () => {
    const a = calcularAhorro(0, 200, 3, 5);
    const b = calcularAhorro(0, 200, 3, 10);
    expect(b.intereses).toBeGreaterThan(a.intereses * 2);
  });
});
