import type { APIRoute } from 'astro';
import { SITIO } from '../lib/sitio';
import { todosLosArticulos, urlArticulo } from '../lib/articulos';
import { construirSitemapNoticias, noticiasRecientes } from '../lib/sitemap';

/**
 * Sitemap de noticias (Google News): solo artículos de los últimos 2 días,
 * como exige la especificación de Google News.
 */
export const GET: APIRoute = async () => {
  const arts = await todosLosArticulos();
  const recientes = noticiasRecientes(
    arts.map((a) => ({ a, fecha: a.data.fechaPublicacion })),
  ).map(({ a }) => ({
    loc: new URL(urlArticulo(a), SITIO.url).href,
    titulo: a.data.titulo,
    fecha: a.data.fechaPublicacion.toISOString(),
  }));

  const xml = construirSitemapNoticias(recientes, SITIO.nombre);
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
