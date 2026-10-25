import type { APIRoute } from 'astro';
import { SITIO } from '../lib/sitio';

export const GET: APIRoute = () => {
  // Instagram y Facebook descargan las imágenes de los carruseles de /redes/ para publicarlos.
  const cuerpo = `User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /
Disallow: /redes/

Sitemap: ${SITIO.url}/sitemap.xml
Sitemap: ${SITIO.url}/sitemap-news.xml
`;
  return new Response(cuerpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
