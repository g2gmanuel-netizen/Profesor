import type { APIRoute } from 'astro';
import { SITIO } from '../lib/sitio';

export const GET: APIRoute = () => {
  const cuerpo = `User-agent: *
Allow: /

Sitemap: ${SITIO.url}/sitemap.xml
Sitemap: ${SITIO.url}/sitemap-news.xml
`;
  return new Response(cuerpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
