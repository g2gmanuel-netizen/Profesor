/** Versión en inglés de la web: vive bajo /en/ y reutiliza la maqueta de la española. */
import { getCollection, type CollectionEntry } from 'astro:content';
import { CATEGORIAS, type Categoria } from './sitio';

export type ArticuloEn = CollectionEntry<'articulosEn'>;

export function esIngles(ruta: string): boolean {
  return ruta === '/en' || ruta.startsWith('/en/');
}

export const CATEGORIAS_EN: Record<string, { nombre: string; descripcion: string }> = {
  actualidad: { nombre: 'News', descripcion: 'What is happening in Spain today, explained clearly.' },
  bolsa: {
    nombre: 'Markets',
    descripcion:
      'In-depth stock analysis with real numbers, catalysts and scenarios. Educational content, not investment advice.',
  },
  politica: { nombre: 'Politics', descripcion: 'Laws and decisions that affect you, without the jargon.' },
  sociedad: { nombre: 'Society', descripcion: 'The issues that move society, with context and data.' },
  vivienda: { nombre: 'Housing', descripcion: 'Buying, prices, mortgages and the Euribor in Spain.' },
  alquiler: { nombre: 'Renting', descripcion: 'Rents, contracts, aid and rental regulation.' },
  ahorro: { nombre: 'Savings', descripcion: 'Deposits, accounts, conservative investing and planning.' },
  impuestos: { nombre: 'Taxes', descripcion: 'Income tax, VAT, tax returns and what changes for your wallet.' },
  pensiones: { nombre: 'Pensions', descripcion: 'Retirement, yearly increases and Social Security.' },
  precios: { nombre: 'Prices', descripcion: 'Inflation, electricity, fuel, food and the cost of living.' },
};

export function categoriaEn(slug: string): Categoria {
  const c = CATEGORIAS_EN[slug];
  return { slug, nombre: c?.nombre ?? slug, descripcion: c?.descripcion ?? '' };
}

/** Artículos en inglés publicables, del más reciente al más antiguo. */
export async function articulosEn(): Promise<ArticuloEn[]> {
  const arts = await getCollection('articulosEn', ({ data }: ArticuloEn) =>
    import.meta.env.PROD ? data.borrador !== true : true,
  );
  return arts.sort(
    (a: ArticuloEn, b: ArticuloEn) => b.data.fechaPublicacion.valueOf() - a.data.fechaPublicacion.valueOf(),
  );
}

export async function categoriasEnConArticulos(): Promise<Categoria[]> {
  const usadas = new Set((await articulosEn()).map((a) => a.data.categoria));
  return CATEGORIAS.filter((c) => usadas.has(c.slug)).map((c) => categoriaEn(c.slug));
}

export function urlArticuloEn(id: string): string {
  return `/en/article/${id}/`;
}

export function fechaEn(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function minutosEn(a: ArticuloEn): number {
  return Math.max(2, Math.round((a.body ?? '').split(/\s+/).filter(Boolean).length / 220));
}

/**
 * Enlace del selector de idioma: la misma noticia en el otro idioma si existe;
 * si no, la portada de ese idioma.
 */
export async function rutaOtroIdioma(ruta: string): Promise<string> {
  const limpia = ruta.endsWith('/') ? ruta : `${ruta}/`;
  const en = limpia.match(/^\/en\/article\/(.+)\/$/);
  if (en) return `/articulo/${en[1]}/`;
  const es = limpia.match(/^\/articulo\/(.+)\/$/);
  if (es) {
    const hay = (await articulosEn()).some((a) => a.id === es[1]);
    return hay ? urlArticuloEn(es[1]!) : '/en/';
  }
  const catEn = limpia.match(/^\/en\/category\/(.+)\/$/);
  if (catEn) return `/categoria/${catEn[1]}/`;
  if (esIngles(limpia)) return '/';
  return '/en/';
}
