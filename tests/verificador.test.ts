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

  it('no marca marcadores de lista ni ordinales', () => {
    const texto = 'Pasos: 1. Revisa. 2. Compara. 3. Decide. El punto 4. es clave.';
    expect(cifrasSinRespaldo(texto, ficha)).toHaveLength(0);
    expect(extraerCifras(texto)).toHaveLength(0);
  });

  it('no marca años', () => {
    expect(cifrasSinRespaldo('Entre 2020 y 2027 cambió la norma.', ficha)).toHaveLength(0);
  });

  it('sí marca un importe inventado con unidad', () => {
    expect(cifrasSinRespaldo('Un alquiler de 1.200 € al mes.', ficha).length).toBeGreaterThan(0);
  });
});
