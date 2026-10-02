/** Builders puros de sitemaps, reutilizados por los endpoints y testeables. */

export interface UrlSitemap {
  loc: string;
  lastmod?: string;
}

export function escaparXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function construirSitemap(urls: UrlSitemap[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${escaparXml(u.loc)}</loc>${
        u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''
      }</url>`,
  )
  .join('\n')}
</urlset>`;
}

export interface NoticiaSitemap {
  loc: string;
  titulo: string;
  fecha: string; // ISO
}

export function construirSitemapNoticias(items: NoticiaSitemap[], nombreMedio: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items
  .map(
    (a) => `  <url>
    <loc>${escaparXml(a.loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escaparXml(nombreMedio)}</news:name>
        <news:language>es</news:language>
      </news:publication>
      <news:publication_date>${a.fecha}</news:publication_date>
      <news:title>${escaparXml(a.titulo)}</news:title>
    </news:news>
  </url>`,
  )
  .join('\n')}
</urlset>`;
}

/** Filtra las noticias de los últimos N días (Google News exige 2 días). */
export function noticiasRecientes<T extends { fecha: Date }>(items: T[], dias = 2, ahora = Date.now()): T[] {
  const limite = ahora - dias * 24 * 60 * 60 * 1000;
  return items.filter((i) => i.fecha.valueOf() >= limite);
}
