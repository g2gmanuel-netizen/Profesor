import { describe, expect, it } from 'vitest';
import { enlace, pendientes, recortar, textoBluesky, textoFacebook, type Noticia } from '../scripts/redes-auto';

const noticia = (slug: string, fecha: string, titulo = 'Titular de prueba'): Noticia => ({
  slug,
  titulo,
  subtitulo: 'Entradilla de la noticia con lo esencial.',
  descripcion: 'Descripción',
  fecha,
  imagen: '',
  claves: ['Clave uno', 'Clave dos', 'Clave tres', 'Clave cuatro'],
});

describe('publicación automática en redes', () => {
  it('los enlaces llevan la red en las etiquetas UTM', () => {
    expect(enlace('mi-noticia', 'bluesky')).toMatch(/\/articulo\/mi-noticia\/\?utm_source=bluesky&utm_medium=social/);
  });

  it('el texto de Bluesky nunca pasa de 300 caracteres', () => {
    const larga = noticia('x', '2026-10-25', 'Titular '.repeat(20));
    larga.subtitulo = 'Entradilla muy larga '.repeat(30);
    expect(Array.from(textoBluesky(larga)).length).toBeLessThanOrEqual(300);
    expect(textoBluesky(noticia('y', '2026-10-25'))).toContain('Entradilla');
  });

  it('Facebook incluye tres claves y el enlace', () => {
    const t = textoFacebook(noticia('z', '2026-10-25'));
    expect(t.match(/✅/g)).toHaveLength(3);
    expect(t).toContain('utm_source=facebook');
  });

  it('solo publica noticias recientes y no repetidas, como mucho 3 y de la más antigua a la más nueva', () => {
    const hoy = new Date('2026-10-25T12:00:00Z');
    const lista = [
      noticia('d', '2026-10-25'),
      noticia('c', '2026-10-24'),
      noticia('b', '2026-10-24'),
      noticia('a', '2026-10-23'),
      noticia('vieja', '2026-10-01'),
    ];
    const cola = pendientes(lista, ['c'], hoy);
    expect(cola.map((n) => n.slug)).toEqual(['a', 'b', 'd']);
  });

  it('recortar no parte palabras', () => {
    expect(recortar('uno dos tres cuatro', 10)).toBe('uno dos…');
  });
});
