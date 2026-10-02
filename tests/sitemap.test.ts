import { describe, it, expect } from 'vitest';
import {
  construirSitemap,
  construirSitemapNoticias,
  noticiasRecientes,
  escaparXml,
} from '../src/lib/sitemap';

describe('sitemaps', () => {
  it('genera un urlset válido con lastmod', () => {
    const xml = construirSitemap([
      { loc: 'https://x.es/' },
      { loc: 'https://x.es/a/', lastmod: '2026-01-01T00:00:00.000Z' },
    ]);
    expect(xml).toContain('<urlset');
    expect(xml).toContain('<loc>https://x.es/a/</loc>');
    expect(xml).toContain('<lastmod>2026-01-01T00:00:00.000Z</lastmod>');
  });

  it('escapa caracteres especiales en títulos de noticias', () => {
    const xml = construirSitemapNoticias(
      [{ loc: 'https://x.es/a/', titulo: 'Luz & gas <sube>', fecha: '2026-01-01T00:00:00.000Z' }],
      'Bolsillo Diario',
    );
    expect(xml).toContain('Luz &amp; gas &lt;sube&gt;');
    expect(xml).toContain('news:news');
  });

  it('filtra noticias de más de 2 días', () => {
    const ahora = new Date('2026-01-10T12:00:00Z').getTime();
    const items = [
      { fecha: new Date('2026-01-10T00:00:00Z') },
      { fecha: new Date('2026-01-01T00:00:00Z') },
    ];
    const recientes = noticiasRecientes(items, 2, ahora);
    expect(recientes).toHaveLength(1);
  });

  it('escaparXml escapa comillas', () => {
    expect(escaparXml(`"a"&'b'`)).toBe('&quot;a&quot;&amp;&apos;b&apos;');
  });
});
