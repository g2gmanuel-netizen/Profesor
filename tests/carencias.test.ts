import { describe, it, expect } from 'vitest';
import { detectarCarencias, limpiarCarencias, limpiarLista } from '../agentes/lib/carencias';
import { esDuplicado, normalizarUrl } from '../agentes/lib/publicados';

describe('filtro de carencias (no hablar de datos que faltan)', () => {
  it('detecta frases sobre fuentes internas', () => {
    expect(detectarCarencias('La ficha no detalla el porcentaje.')).not.toHaveLength(0);
    expect(detectarCarencias('No tenemos datos concretos en el JSON.')).not.toHaveLength(0);
    expect(detectarCarencias('El IPC subió un 2,8 % según el INE.')).toHaveLength(0);
  });

  it('quita la frase pero conserva el resto del párrafo y las cifras', () => {
    const md = 'Tu pensión media será de 1.700 euros. La ficha no especifica si es bruta o neta. Consulta el simulador.';
    const r = limpiarCarencias(md);
    expect(r).toContain('1.700 euros');
    expect(r).toContain('Consulta el simulador.');
    expect(r).not.toMatch(/ficha/i);
  });

  it('elimina secciones enteras de "lo que no sabemos" y sus viñetas', () => {
    const md = [
      '## Qué ha pasado', '', 'Texto útil.', '',
      '## Lo que todavía no sabemos', '', '- **La fecha.** No consta.', '- **El importe.**', '',
      '## Qué significa para ti', '', 'Consejo práctico.',
    ].join('\n');
    const r = limpiarCarencias(md);
    expect(r).not.toMatch(/no sabemos|No consta|El importe/);
    expect(r).toContain('## Qué significa para ti');
    expect(r).toContain('Texto útil.');
  });

  it('quita filas de tabla "no disponible" y puntos clave con carencias', () => {
    const md = '| Dato | Valor |\n|---|---|\n| PER | 25 |\n| Deuda | No disponible |';
    expect(limpiarCarencias(md)).not.toMatch(/No disponible/);
    expect(limpiarLista(['Sube con el IPC', 'No consta la fecha'])).toEqual(['Sube con el IPC']);
  });
});

describe('detección de noticias repetidas', () => {
  const historial = [
    {
      id: 'a', slug: 'a', categoria: 'hipotecas', fecha: '2026-10-05',
      titulo: 'Esfuerzo hipotecario al 65%: qué significa y cómo saber si tu caso es tan grave',
      urls: ['https://news.google.com/rss/articles/CBMi8gFBVV95cUxNcU9kN2Ntb2RTTDNNVWJzcm1laGtwWXdmYkQ5U1ctQ0hQUnA5eWtJb1VSa1doaWsyRlY4SGRjRktGMVE5NlpRRWV3MU9sQ2dRNllCTERqcTU3TVJwSk8wX2pBTlk5VC1IUWRRZTJMUjA4UXB5NFBlYWtJNG5HU2tXNExGYWJjSllELWhpWDBERGkyZUFJSFhmbEFkVzFvbFdNcnlxcFpNcG9iZUo3LUdZdEphNlE1VkFtc2ZHdDV6NFIwMzJlOThoQllEXzZKcW1sMVFnUHptbk93QklQMXh2Q051eUFKdVhKRUd4N3BZeVpPUdIBaaaa?oc=5'],
    },
  ];
  it('misma fuente de Google News aunque cambie el final del enlace = duplicado', () => {
    const otra = historial[0]!.urls[0]!.replace('aaaa?oc=5', 'bbbb?oc=5');
    expect(esDuplicado('Esfuerzo hipotecario en máximos', otra, historial)).toBeTruthy();
  });
  it('titulares de temas distintos con plantilla común no son duplicados', () => {
    expect(esDuplicado('Pagas más del 40 % de tu sueldo en alquiler: qué significa y qué puedes hacer', undefined, historial)).toBeUndefined();
  });
  it('misma cifra y mismo tema con titular reformulado = duplicado', () => {
    const previos = [{ id: 'a', slug: 'a', titulo: 'Esfuerzo hipotecario al 65%: qué significa y cómo saber si tu caso es tan grave', categoria: 'vivienda', fecha: '2026-10-05', urls: [] }];
    expect(esDuplicado('Esfuerzo hipotecario del 65%: qué mide la cifra y cómo calcular el tuyo', undefined, previos)).toBeTruthy();
    const pensiones = [{ id: 'b', slug: 'b', titulo: 'Nuevas pensiones de 2027: cuánto cobrarás de media y cómo estimar tu caso real', categoria: 'pensiones', fecha: '2026-10-05', urls: [] }];
    expect(esDuplicado('Pensión de 1.700 euros en 2027: por qué la media no sirve para calcular tu jubilación', undefined, pensiones)).toBeTruthy();
    expect(esDuplicado('La pensión mínima sube en 2027: quién la cobra', undefined, pensiones)).toBeUndefined();
  });
  it('normaliza URLs normales', () => {
    expect(normalizarUrl('https://www.ine.es/prensa/ipc.htm?x=1')).toBe('ine.es/prensa/ipc.htm');
  });
});
