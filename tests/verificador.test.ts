import { describe, it, expect } from 'vitest';
import { cifrasSinRespaldo, extraerCifras } from '../agentes/agentes/07-verificador';
import type { FichaHechos } from '../agentes/lib/esquemas';

const ficha: FichaHechos = {
  temaId: 't1',
  titulo: 'Euríbor',
  hechos: [
    {
      afirmacion: 'El Euríbor a 12 meses cerró septiembre en el 2,1 %.',
      url: 'https://www.bde.es/',
      organismo: 'Banco de España',
    },
  ],
  contexto: [],
  fuentes: [{ titulo: 'BdE', url: 'https://www.bde.es/' }],
  datosNumericos: [{ etiqueta: 'Euríbor', valor: 2.1, unidad: '%' }],
};

describe('verificador — guardia de cifras', () => {
  it('extrae cifras con unidad', () => {
    expect(extraerCifras('sube al 2,1 % y cuesta 150.000 €')).toContain('2,1%');
  });

  it('acepta un texto cuyas cifras están todas en la ficha', () => {
    const problemas = cifrasSinRespaldo('El Euríbor quedó en el 2,1 % en septiembre.', ficha);
    expect(problemas).toHaveLength(0);
  });

  it('detecta una cifra inventada que no está en la ficha', () => {
    const problemas = cifrasSinRespaldo('El Euríbor se disparó al 9,8 % en un día.', ficha);
    expect(problemas.length).toBeGreaterThan(0);
  });
});
