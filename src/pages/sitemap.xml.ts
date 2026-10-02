import type { APIRoute } from 'astro';
import { SITIO, CATEGORIAS, slugAutor } from '../lib/sitio';
import { todosLosArticulos, urlArticulo } from '../lib/articulos';

export const GET: APIRoute = async () => {
  const arts = await todosLosArticulos();
  const base = SITIO.url;

  const urls: { loc: string; lastmod?: string }[] = [
    { loc: `${base}/` },
    { loc: `${base}/buscar/` },
    { loc: `${base}/sobre-nosotros/` },
    { loc: `${base}/contacto/` },
    { loc: `${base}/politica-editorial/` },
    { loc: `${base}/aviso-legal/` },
    { loc: `${base}/politica-privacidad/` },
    { loc: `${base}/politica-cookies/` },
  ];

  for (const c of CATEGORIAS) urls.push({ loc: `${base}/categoria/${c.slug}/` });

  const autores = new Set<string>();
  for (const a of arts) autores.add(slugAutor(a.data.autor));
  for (const s of autores) urls.push({ loc: `${base}/autor/${s}/` });

  for (const a of arts) {
    urls.push({
      loc: new URL(urlArticulo(a), base).href,
      lastmod: (a.data.fechaActualizacion ?? a.data.fechaPublicacion).toISOString(),
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
