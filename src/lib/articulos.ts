import { getCollection, type CollectionEntry } from 'astro:content';

export type Articulo = CollectionEntry<'articulos'>;

const esProd = import.meta.env.PROD;

/** Todos los artículos publicables, ordenados por fecha descendente. */
export async function todosLosArticulos(): Promise<Articulo[]> {
  const arts = await getCollection('articulos', ({ data }) => {
    // En producción ocultamos borradores; en dev se ven todos.
    return esProd ? data.borrador !== true : true;
  });
  return arts.sort(
    (a, b) => b.data.fechaPublicacion.valueOf() - a.data.fechaPublicacion.valueOf(),
  );
}

export async function articulosPorCategoria(slug: string): Promise<Articulo[]> {
  const arts = await todosLosArticulos();
  return arts.filter((a) => a.data.categoria === slug);
}

export async function articulosPorAutor(slugAutor: string): Promise<Articulo[]> {
  const arts = await todosLosArticulos();
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  return arts.filter((a) => norm(a.data.autor) === slugAutor);
}

export async function destacados(n = 4): Promise<Articulo[]> {
  const arts = await todosLosArticulos();
  const marcados = arts.filter((a) => a.data.destacado);
  const resto = arts.filter((a) => !a.data.destacado);
  return [...marcados, ...resto].slice(0, n);
}

/** Artículos relacionados: misma categoría o etiquetas compartidas. */
export async function relacionados(articulo: Articulo, n = 4): Promise<Articulo[]> {
  const arts = (await todosLosArticulos()).filter((a) => a.id !== articulo.id);
  const puntuar = (a: Articulo): number => {
    let p = 0;
    if (a.data.categoria === articulo.data.categoria) p += 3;
    const comunes = a.data.etiquetas.filter((t) => articulo.data.etiquetas.includes(t));
    p += comunes.length;
    return p;
  };
  return arts
    .map((a) => ({ a, p: puntuar(a) }))
    .sort((x, y) => y.p - x.p)
    .slice(0, n)
    .map((x) => x.a);
}

export function urlArticulo(a: Articulo): string {
  return `/articulo/${a.id}/`;
}

export function fechaLegible(d: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function fechaISO(d: Date): string {
  return d.toISOString();
}
