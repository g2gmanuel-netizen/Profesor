import type { APIRoute } from 'astro';
import { SITIO, CATEGORIAS, slugAutor } from '../lib/sitio';
import { todosLosArticulos, urlArticulo } from '../lib/articulos';
import { construirSitemap, type UrlSitemap } from '../lib/sitemap';

export const GET: APIRoute = async () => {
  const arts = await todosLosArticulos();
  const base = SITIO.url;

  const urls: UrlSitemap[] = [
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

  return new Response(construirSitemap(urls), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
