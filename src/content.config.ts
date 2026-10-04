import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORIAS } from './lib/sitio';

const slugsCategoria = CATEGORIAS.map((c) => c.slug) as [string, ...string[]];

/**
 * Esquema del frontmatter de cada artículo. Es el contrato que el agente
 * "SEO y Discover" (agente 9) debe cumplir. Si un artículo no valida, el build falla:
 * es intencionado, evita publicar piezas mal formadas.
 */
const articulos = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articulos' }),
  schema: z.object({
    titulo: z.string().min(10).max(140),
    subtitulo: z.string().min(10).max(220),
    tituloSeo: z.string().max(65),
    descripcion: z.string().min(50).max(165),
    categoria: z.enum(slugsCategoria),
    autor: z.string().min(2),
    fechaPublicacion: z.coerce.date(),
    fechaActualizacion: z.coerce.date().optional(),
    imagen: z.string().default('/imagenes/portada-generica.svg'),
    imagenAlt: z.string().min(5),
    imagenCredito: z.string().optional(),
    etiquetas: z.array(z.string()).default([]),
    fuentes: z
      .array(
        z.object({
          titulo: z.string(),
          url: z.string().url(),
          organismo: z.string().optional(),
        }),
      )
      .min(1, 'Cada artículo debe citar al menos una fuente'),
    clavesRapidas: z.array(z.string()).default([]),
    titularesAlternativos: z.array(z.string()).default([]),
    enlacesInternos: z.array(z.string()).default([]),
    elaboradoConIA: z.boolean().default(true),
    destacado: z.boolean().default(false),
    borrador: z.boolean().default(false),
  }),
});

export const collections = { articulos };
