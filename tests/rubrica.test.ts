import { describe, it, expect } from 'vitest';
import { puntuarTitular, elegirMejorTitular } from '../agentes/lib/rubrica';

describe('rúbrica de titulares', () => {
  it('descalifica (0) un titular no fiel', () => {
    const r = puntuarTitular({ titular: 'El Euríbor baja al 2,1 %', entidades: ['euríbor'], fiel: false });
    expect(r.total).toBe(0);
  });

  it('premia dato + consecuencia con utilidad explícita', () => {
    const bueno = puntuarTitular({
      titular: 'El Euríbor baja al 2,1 %: así cambia tu hipoteca en 2027',
      entidades: ['euríbor'],
      fiel: true,
    });
    expect(bueno.total).toBeGreaterThan(6);
  });

  it('penaliza el sensacionalismo y las mayúsculas gritonas', () => {
    const malo = puntuarTitular({
      titular: 'NO CREERÁS lo que pasa con tu hipoteca',
      entidades: ['hipoteca'],
      fiel: true,
    });
    const bueno = puntuarTitular({
      titular: 'Cómo cambia tu hipoteca si el Euríbor baja al 2,1 %',
      entidades: ['euríbor'],
      fiel: true,
    });
    expect(bueno.total).toBeGreaterThan(malo.total);
  });

  it('elige el titular de mayor puntuación', () => {
    const { elegido } = elegirMejorTitular(
      [
        'Noticias de hoy',
        'El Euríbor baja al 2,1 %: así cambia tu cuota de hipoteca',
        'NO TE LO PIERDAS: hipotecas',
      ],
      ['euríbor'],
      true,
    );
    expect(elegido).toContain('Euríbor');
  });
});

import { empiezaPorMedio } from '../agentes/agentes/06-titulador';
describe('titulares con nombre de otro medio', () => {
  it('descarta los que empiezan por un medio', () => {
    expect(empiezaPorMedio('El Confidencial: Francia anticipa el dilema de pensiones')).toBe(true);
    expect(empiezaPorMedio('El Economista: inquilinos con más ahorros que propietarios')).toBe(true);
    expect(empiezaPorMedio('SMI e IRPF: qué explica RTVE.es y cómo comprobar tu caso')).toBe(true);
    expect(empiezaPorMedio('Lo que dice El Diario: algo', ['Noticia (El Diario)'])).toBe(false);
  });
  it('acepta titulares propios', () => {
    expect(empiezaPorMedio('Huelga general del 11-N: todo lo que debes saber')).toBe(false);
    expect(empiezaPorMedio('Abc del IRPF: guía rápida')).toBe(false);
  });
});
