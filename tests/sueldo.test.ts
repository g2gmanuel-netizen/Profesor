import { describe, it, expect } from 'vitest';
import { compararSueldo, CORTES } from '../src/lib/sueldo';

describe('comparador de sueldos', () => {
  it('sitúa el salario mediano en el 50 %', () => {
    expect(compararSueldo(2001.4 * 12).percentil).toBe(50);
  });
  it('marca los extremos sin inventar un porcentaje', () => {
    expect(compararSueldo(12000)).toMatchObject({ extremo: 'bajo', percentil: null });
    expect(compararSueldo(60000)).toMatchObject({ extremo: 'alto', percentil: null });
  });
  it('interpola entre dos cortes conocidos', () => {
    // Punto medio entre el corte del 30 % y el del 50 %.
    const medio = ((1582.2 + 2001.4) / 2) * 12;
    expect(compararSueldo(medio).percentil).toBe(40);
  });
  it('el percentil nunca baja al subir el sueldo', () => {
    let previo = 0;
    for (let s = 13000; s < 48000; s += 500) {
      const p = compararSueldo(s).percentil;
      if (p === null) continue;
      expect(p).toBeGreaterThanOrEqual(previo);
      previo = p;
    }
  });
  it('los cortes están ordenados', () => {
    for (let i = 1; i < CORTES.length; i++) {
      expect(CORTES[i]![0]).toBeGreaterThan(CORTES[i - 1]![0]);
      expect(CORTES[i]![1]).toBeGreaterThan(CORTES[i - 1]![1]);
    }
  });
  it('calcula lo que falta para los 50.000 €', () => {
    expect(compararSueldo(30000).faltaPromesa).toBe(20000);
  });
});
