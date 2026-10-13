import { describe, it, expect } from 'vitest';
import { busquedaParaArticulo, fotoAdmisible } from '../agentes/lib/fotos';

describe('búsqueda de fotos por concepto', () => {
  it('"Banco de España" es la institución, no un banco de parque', () => {
    const b = busquedaParaArticulo('alquiler', 'Banco de España avisa contra topar el alquiler');
    expect(b.consultas[0]).toMatch(/bank of spain|madrid/);
    expect(fotoAdmisible('bench, park, autumn', b)).toBe(false);
    expect(fotoAdmisible('madrid, spain, architecture', b)).toBe(true);
  });
  it('la luz es electricidad y las pensiones, jubilación', () => {
    expect(busquedaParaArticulo('precios', 'Qué es el PVPC y tu factura de la luz').consultas[0]).toMatch(/electric/);
    expect(busquedaParaArticulo('pensiones', 'Nuevas pensiones de 2027').consultas[0]).toMatch(/retirement/);
  });
  it('descarta fotos de otros países', () => {
    expect(fotoAdmisible('money, rupee, india', {})).toBe(false);
    expect(fotoAdmisible('capitol, washington, congress', {})).toBe(false);
    expect(fotoAdmisible('euro, coins, savings', {})).toBe(true);
  });
});

describe('Congreso: siempre algo institucional español', () => {
  const b = busquedaParaArticulo('politica', 'El Congreso rechaza los decretos de vivienda');
  it('acepta bandera de España o el Congreso, rechaza estadios o paisajes', () => {
    expect(fotoAdmisible('spain, flag, wind', b)).toBe(true);
    expect(fotoAdmisible('madrid, congress, parliament', b)).toBe(true);
    expect(fotoAdmisible('stadium, seats, madrid, spain', b)).toBe(false);
    expect(fotoAdmisible('madrid, sunset, city', b)).toBe(false);
  });
});
