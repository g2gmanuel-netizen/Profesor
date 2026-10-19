import { describe, expect, it } from 'vitest';
import { COMUNIDADES, DATOS_VACIOS, compararComunidades, tramosCombinados } from '../src/lib/irpf';

describe('tramos y comparativa', () => {
  it('los tramos combinados suman la base', () => {
    const madrid = COMUNIDADES.find((c) => c.slug === 'madrid')!;
    const t = tramosCombinados(50000, madrid.escala);
    expect(t.reduce((s, x) => s + x.base, 0)).toBeCloseTo(50000, 2);
    expect(t[0]!.tipo).toBe(18);
  });

  it('compara todas las comunidades de régimen común ordenadas', () => {
    const r = compararComunidades({ ...DATOS_VACIOS, salario: 40000 });
    expect(r.length).toBe(17);
    for (let i = 1; i < r.length; i++) expect(r[i]!.irpf).toBeGreaterThanOrEqual(r[i - 1]!.irpf);
  });
});
