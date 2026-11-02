import { describe, it, expect } from 'vitest';
import { cuotaMensual, calcularHipoteca, esfuerzo } from '../src/lib/hipoteca';

describe('calculadora de hipoteca', () => {
  it('coincide con el ejemplo de la guía del Euríbor (150.000 € a 25 años)', () => {
    expect(Math.round(cuotaMensual(150000, 25, 1.99))).toBe(635);
    expect(Math.round(cuotaMensual(150000, 25, 2.99))).toBe(711);
    expect(Math.round(cuotaMensual(150000, 25, 3.99))).toBe(791);
  });
  it('sin interés reparte el capital en cuotas iguales', () => {
    expect(cuotaMensual(120000, 10, 0)).toBe(1000);
  });
  it('el cuadro anual amortiza todo el capital', () => {
    const r = calcularHipoteca({ capital: 200000, anos: 30, tipoAnual: 3 });
    expect(r.porAno).toHaveLength(30);
    expect(r.porAno.at(-1)!.pendiente).toBeLessThan(0.01);
    const amortizado = r.porAno.reduce((a, f) => a + f.amortizado, 0);
    expect(Math.round(amortizado)).toBe(200000);
    expect(Math.round(r.totalPagado - r.totalIntereses)).toBe(200000);
  });
  it('calcula el esfuerzo sobre los ingresos', () => {
    expect(esfuerzo(700, 2000)).toBe(35);
    expect(esfuerzo(700, 0)).toBe(0);
  });
});
