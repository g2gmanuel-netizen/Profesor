import { describe, it, expect } from 'vitest';
import { ArticuloFinalSchema, FichaHechosSchema, CandidatoSchema } from '../agentes/lib/esquemas';

describe('validación de esquemas (Zod)', () => {
  it('rechaza una ficha de hechos sin fuentes', () => {
    const res = FichaHechosSchema.safeParse({
      temaId: 't',
      titulo: 'x',
      hechos: [{ afirmacion: 'a', url: 'https://x.es/' }],
      contexto: [],
      fuentes: [],
      datosNumericos: [],
    });
    expect(res.success).toBe(false);
  });

  it('rechaza un candidato con categoría inválida', () => {
    const res = CandidatoSchema.safeParse({
      id: '1',
      titulo: 't',
      resumenFuente: 'r',
      url: 'https://x.es/',
      fechaDeteccion: '2026-01-01',
      categoriaSugerida: 'deportes',
    });
    expect(res.success).toBe(false);
  });

  it('rechaza un artículo final con descripción demasiado corta', () => {
    const base = {
      slug: 's',
      frontmatter: {
        titulo: 'Un titular válido de prueba',
        subtitulo: 'Un subtítulo suficientemente largo para validar',
        tituloSeo: 'SEO',
        descripcion: 'corta',
        categoria: 'hipotecas',
        autor: 'Redacción',
        fechaPublicacion: '2026-01-01',
        imagen: '/imagenes/x.svg',
        imagenAlt: 'alt descriptivo',
        etiquetas: ['a'],
        fuentes: [{ titulo: 'f', url: 'https://x.es/' }],
        clavesRapidas: [],
        titularesAlternativos: [],
        enlacesInternos: [],
        elaboradoConIA: true,
        destacado: false,
      },
      cuerpoMarkdown: '# hola',
    };
    expect(ArticuloFinalSchema.safeParse(base).success).toBe(false);
  });

  it('acepta un artículo final correcto', () => {
    const ok = {
      slug: 's',
      frontmatter: {
        titulo: 'Un titular válido de prueba',
        subtitulo: 'Un subtítulo suficientemente largo para validar',
        tituloSeo: 'SEO válido',
        descripcion: 'Una descripción con la longitud adecuada para pasar la validación mínima exigida.',
        categoria: 'hipotecas',
        autor: 'Redacción',
        fechaPublicacion: '2026-01-01',
        imagen: '/imagenes/x.svg',
        imagenAlt: 'alt descriptivo',
        etiquetas: ['a'],
        fuentes: [{ titulo: 'f', url: 'https://x.es/' }],
        clavesRapidas: [],
        titularesAlternativos: [],
        enlacesInternos: [],
        elaboradoConIA: true,
        destacado: false,
      },
      cuerpoMarkdown: '# hola',
    };
    expect(ArticuloFinalSchema.safeParse(ok).success).toBe(true);
  });
});
