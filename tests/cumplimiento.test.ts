import { describe, it, expect } from 'vitest';
import { revisarCumplimiento, revisarValorAnadido } from '../agentes/agentes/08-cumplimiento';

const RELLENO = Array.from({ length: 140 }, () => 'El Euríbor marca la cuota de muchas hipotecas.').join(' ');
const CUERPO_UTIL = [
  'El Euríbor bajó en septiembre. Esto abarata las hipotecas variables para muchas familias.',
  RELLENO,
  '## Qué significa para ti',
  '1. Mira la fecha de revisión en tu escritura.',
  '2. Comprueba el diferencial de tu préstamo.',
  '3. Pide al banco el cuadro de amortización nuevo.',
].join('\n\n');

describe('valor añadido (AdSense)', () => {
  it('acepta un artículo largo con sección práctica y pasos', () => {
    expect(revisarValorAnadido(CUERPO_UTIL)).toEqual([]);
  });
  it('rechaza un resumen corto sin parte práctica', () => {
    const m = revisarValorAnadido('El Euríbor bajó en septiembre, según un medio.');
    expect(m.length).toBe(3);
  });
  it('acepta una tabla como elemento propio', () => {
    const t = `${RELLENO}\n\n## Cómo calcular tu cuota\n\n| Euríbor | Cuota |\n|---|---|\n| 2 % | 711 € |`;
    expect(revisarValorAnadido(t)).toEqual([]);
  });
});

describe('revisor de cumplimiento', () => {
  it('aprueba un texto limpio con titular coherente', () => {
    const r = revisarCumplimiento(
      'El Euríbor baja y abarata las hipotecas',
      CUERPO_UTIL,
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
