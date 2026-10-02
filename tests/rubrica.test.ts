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
