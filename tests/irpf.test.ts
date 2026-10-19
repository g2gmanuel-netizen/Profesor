import { describe, expect, it } from 'vitest';
import { COMUNIDADES, DATOS_VACIOS, ESCALA_ESTATAL, aplicarEscala, calcular, consejos } from '../src/lib/irpf';

const cantabria = COMUNIDADES.find((c) => c.slug === 'cantabria')!;

describe('escalas del IRPF', () => {
  it('aplica la escala estatal por tramos', () => {
    expect(aplicarEscala(35200, ESCALA_ESTATAL)).toBeCloseTo(4362.75, 2);
    expect(aplicarEscala(0, ESCALA_ESTATAL)).toBe(0);
  });

  it('cuadra con la cuota acumulada publicada para Cantabria', () => {
    expect(aplicarEscala(60000, cantabria.escala)).toBeCloseTo(8508, 0);
  });

  it('todas las escalas son crecientes', () => {
    for (const c of COMUNIDADES) {
      for (let i = 1; i < c.escala.length; i++) {
        expect(c.escala[i]![0]).toBeGreaterThan(c.escala[i - 1]![0]);
        expect(c.escala[i]![1]).toBeGreaterThanOrEqual(c.escala[i - 1]![1]);
      }
    }
  });
});

describe('calcular', () => {
  it('un salario de SMI no paga IRPF', () => {
    const r = calcular({ ...DATOS_VACIOS, comunidad: 'castilla-la-mancha', salario: 17094 });
    expect(r.cuotaLiquida).toBe(0);
  });

  it('30.000 € en Madrid: resultados coherentes', () => {
    const r = calcular({ ...DATOS_VACIOS, comunidad: 'madrid', salario: 30000, retencionesTrabajo: 4000 });
    // Seguridad Social 6,5 % y rendimiento neto = 30.000 - 1.950 - 2.000.
    expect(r.ssTrabajador).toBeCloseTo(1950, 0);
    expect(r.baseLiquidableGeneral).toBeCloseTo(26050, 0);
    expect(r.cuotaIntegra).toBeGreaterThan(4000);
    expect(r.cuotaIntegra).toBeLessThan(5000);
    expect(r.cuotaDiferencial).toBeCloseTo(r.cuotaLiquida - 4000, 2);
    expect(r.netoAnual).toBeCloseTo(30000 - r.ssTrabajador - r.irpfTotal, 2);
  });

  it('los hijos y el plan de pensiones bajan la cuota', () => {
    const base = calcular({ ...DATOS_VACIOS, salario: 45000 });
    const conHijos = calcular({ ...DATOS_VACIOS, salario: 45000, hijos: 2, hijosMenores3: 1 });
    const conPlan = calcular({ ...DATOS_VACIOS, salario: 45000, planPropio: 1500 });
    expect(conHijos.irpfTotal).toBeLessThan(base.irpfTotal);
    expect(conPlan.cuotaIntegra).toBeLessThan(base.cuotaIntegra);
  });

  it('la base del ahorro tributa al 19 % en el primer tramo', () => {
    const r = calcular({ ...DATOS_VACIOS, salario: 40000, dividendos: 1000 });
    const sin = calcular({ ...DATOS_VACIOS, salario: 40000 });
    expect(r.cuotaIntegra - sin.cuotaIntegra).toBeCloseTo(190, 0);
  });

  it('genera consejos', () => {
    const d = { ...DATOS_VACIOS, salario: 50000 };
    expect(consejos(d, calcular(d)).length).toBeGreaterThan(2);
  });
});
