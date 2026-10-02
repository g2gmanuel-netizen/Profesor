import type { ContextoEjecucion } from '../lib/contexto';
import {
  ArticuloFinalSchema,
  type ArticuloFinal,
  type Borrador,
  type FichaHechos,
  type TemaAprobado,
  type Titulares,
} from '../lib/esquemas';
import { slugify, similitud, tokens } from '../lib/util';

export interface EntradaSeo {
  tema: TemaAprobado;
  ficha: FichaHechos;
  borrador: Borrador;
  titulares: Titulares;
  cuerpoFinal: string;
  etiquetas: string[];
  imagen: string;
  imagenAlt: string;
  autor: string;
  /** Artículos ya existentes para enlaces internos. */
  existentes: { slug: string; titulo: string; categoria: string; etiquetas: string[] }[];
}

/** Agente 9 — SEO y Discover. Ensambla el artículo final con frontmatter completo. */
export function seoDiscover(e: EntradaSeo, ctx: ContextoEjecucion): ArticuloFinal {
  ctx.logger.paso('seo-discover', `Optimizando «${e.titulares.elegido}»`);

  const slug = slugify(e.titulares.elegido || e.ficha.titulo);
  const descripcion = normalizarDescripcion(e.titulares.subtitulo || e.borrador.entradilla);

  // Etiquetas: usa las aportadas y, si son pocas, completa con palabras clave del titular.
  const etiquetas = Array.from(
    new Set([
      ...e.etiquetas,
      e.tema.categoria,
      ...(e.etiquetas.length < 3 ? tokens(e.titulares.elegido).slice(0, 4) : []),
    ]),
  ).slice(0, 6);

  // Enlaces internos: misma categoría o etiquetas compartidas, hasta 4.
  const enlacesInternos = e.existentes
    .map((a) => ({
      slug: a.slug,
      p:
        (a.categoria === e.tema.categoria ? 2 : 0) +
        a.etiquetas.filter((t) => etiquetas.includes(t)).length +
        similitud(a.titulo, e.titulares.elegido),
    }))
    .filter((x) => x.p > 0 && x.slug !== slug)
    .sort((a, b) => b.p - a.p)
    .slice(0, 4)
    .map((x) => x.slug);

  const final: ArticuloFinal = {
    slug,
    frontmatter: {
      titulo: e.titulares.elegido,
      subtitulo: e.titulares.subtitulo,
      tituloSeo: (e.titulares.tituloSeo || e.titulares.elegido).slice(0, 65),
      descripcion,
      categoria: e.tema.categoria,
      autor: e.autor,
      fechaPublicacion: new Date().toISOString().slice(0, 10),
      imagen: e.imagen,
      imagenAlt: e.imagenAlt,
      etiquetas,
      fuentes: e.ficha.fuentes,
      clavesRapidas: e.borrador.clavesRapidas,
      titularesAlternativos: e.titulares.alternativos,
      enlacesInternos,
      elaboradoConIA: true,
      destacado: false,
    },
    cuerpoMarkdown: e.cuerpoFinal,
  };

  return ArticuloFinalSchema.parse(final);
}

function normalizarDescripcion(texto: string): string {
  let d = texto.replace(/\s+/g, ' ').trim().replace(/[«»"]/g, '');
  if (d.length > 165) {
    d = d.slice(0, 162);
    const ultimoEspacio = d.lastIndexOf(' ');
    if (ultimoEspacio > 120) d = d.slice(0, ultimoEspacio);
    d = d.trimEnd() + '…';
  }
  if (d.length < 50) {
    d = (d + ' Lo que necesitas saber y cómo te afecta, explicado claro.').slice(0, 165);
  }
  return d;
}
