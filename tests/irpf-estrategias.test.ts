import { describe, expect, it } from 'vitest';
import { calcular, DATOS_VACIOS, leerImporte, type Datos } from '../src/lib/irpf';
import { estrategias } from '../src/lib/irpf-estrategias';

describe('leerImporte', () => {
  it('entiende los formatos habituales en España', () => {
    expect(leerImporte('45.000')).toBe(45000);
    expect(leerImporte('45000')).toBe(45000);
    expect(leerImporte('1.234,56')).toBe(1234.56);
    expect(leerImporte('1.250.000')).toBe(1250000);
    expect(leerImporte('45 000 €')).toBe(45000);
    expect(leerImporte('1500,5')).toBe(1500.5);
    expect(leerImporte('1,234.56')).toBe(1234.56);
    expect(leerImporte('-1.200')).toBe(-1200);
    expect(leerImporte('250000')).toBe(250000);
    expect(Number.isNaN(leerImporte(''))).toBe(true);
  });
});

describe('estrategias', () => {
  const base = (cambios: Partial<Datos>): Datos => ({ ...DATOS_VACIOS, comunidad: 'madrid', ...cambios });

  it('estima el ahorro de la retribución flexible para un asalariado', () => {
    const d = base({ salario: 45000 });
    const lista = estrategias(d, calcular(d));
    const flexible = lista.find((e) => e.id === 'flexible')!;
    expect(flexible.paraTi).toBe(true);
    expect(flexible.ahorro).toBeGreaterThan(500);
    expect(flexible.ahorro).toBeLessThan(3000);
  });

  it('pone primero las jugadas que encajan con tus datos', () => {
    const d = base({ salario: 30000, gananciasAhorro: 4000 });
    const lista = estrategias(d, calcular(d));
    const primeraAjena = lista.findIndex((e) => !e.paraTi);
    expect(lista.slice(0, primeraAjena).every((e) => e.paraTi)).toBe(true);
    expect(lista.find((e) => e.id === 'perdidas')!.paraTi).toBe(true);
  });

  it('las jugadas de mayores y autónomos solo encajan si aplican', () => {
    const joven = base({ salario: 25000, edad: 30 });
    const l1 = estrategias(joven, calcular(joven));
    expect(l1.find((e) => e.id === 'mayores-65')!.paraTi).toBe(false);
    expect(l1.find((e) => e.id === 'autonomo-ppes')!.paraTi).toBe(false);
    const autonomo = base({ actIngresos: 90000, actGastos: 20000, edad: 62 });
    const l2 = estrategias(autonomo, calcular(autonomo));
    expect(l2.find((e) => e.id === 'sociedad')!.paraTi).toBe(true);
    expect(l2.find((e) => e.id === 'mayores-65')!.paraTi).toBe(true);
    expect(l2.find((e) => e.id === 'autonomo-ppes')!.ahorro).toBeGreaterThan(1000);
  });

  it('todas las jugadas citan una fuente oficial', () => {
    const d = base({ salario: 40000 });
    for (const e of estrategias(d, calcular(d))) expect(e.fuente.url).toMatch(/^https:\/\/(www\.boe\.es|sede\.agenciatributaria\.gob\.es)\//);
  });
});
