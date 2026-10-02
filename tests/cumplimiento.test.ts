import { describe, it, expect } from 'vitest';
import { revisarCumplimiento } from '../agentes/agentes/08-cumplimiento';

describe('revisor de cumplimiento', () => {
  it('aprueba un texto limpio con titular coherente', () => {
    const r = revisarCumplimiento(
      'El Euríbor baja y abarata las hipotecas',
      'El Euríbor bajó en septiembre. Esto abarata las hipotecas variables para muchas familias.',
      ['El índice interbancario registró un descenso el mes pasado.'],
    );
    expect(r.aprobado).toBe(true);
  });

  it('bloquea una cita textual de más de 15 palabras', () => {
    const citaLarga =
      '«' + Array.from({ length: 20 }, (_, i) => `palabra${i}`).join(' ') + '»';
    const r = revisarCumplimiento('Titular con cita', `Texto. ${citaLarga}`, []);
    expect(r.aprobado).toBe(false);
    expect(r.motivos.some((m) => m.includes('Cita textual'))).toBe(true);
  });

  it('detecta copia literal de una fuente', () => {
    const fuente =
      'El Banco de España publicó hoy que el tipo de interés medio de las nuevas hipotecas firmadas por los hogares españoles alcanzó un nuevo nivel durante el pasado mes de referencia estadística';
    const r = revisarCumplimiento('Hipotecas', fuente, [fuente]);
    expect(r.aprobado).toBe(false);
    expect(r.motivos.some((m) => m.toLowerCase().includes('copia'))).toBe(true);
  });

  it('marca lenguaje alarmista', () => {
    const r = revisarCumplimiento(
      'Hipotecas',
      'Esto es una catástrofe para tu bolsillo y vas a la ruina total.',
      [],
    );
    expect(r.aprobado).toBe(false);
  });

  it('marca titular sin relación con el cuerpo (clickbait)', () => {
    const r = revisarCumplimiento(
      'Perarudo zyx qwfp',
      'Texto sobre economía doméstica, hipotecas y ahorro de las familias.',
      [],
    );
    expect(r.aprobado).toBe(false);
  });
});
