import type { APIRoute } from 'astro';
import { SITIO } from '../lib/sitio';
import { todosLosArticulos, urlArticulo } from '../lib/articulos';

/**
 * Sitemap de noticias (Google News): solo artículos de los últimos 2 días,
 * como exige la especificación de Google News.
 */
export const GET: APIRoute = async () => {
  const arts = await todosLosArticulos();
  const limite = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const recientes = arts.filter((a) => a.data.fechaPublicacion.valueOf() >= limite);

  const escapar = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${recientes
  .map(
    (a) => `  <url>
    <loc>${new URL(urlArticulo(a), SITIO.url).href}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapar(SITIO.nombre)}</news:name>
        <news:language>es</news:language>
      </news:publication>
      <news:publication_date>${a.data.fechaPublicacion.toISOString()}</news:publication_date>
      <news:title>${escapar(a.data.titulo)}</news:title>
    </news:news>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
