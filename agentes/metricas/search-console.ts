import { guardarMetrica, pendiente, authCuentaServicio } from './lib';

/** Recolector de Google Search Console (Search Analytics API, cuenta de servicio). */
export async function recolectarSearchConsole(): Promise<string> {
  const site = process.env.SEARCH_CONSOLE_SITE_URL;
  if (!site || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return guardarMetrica(
      'search-console',
      pendiente(
        'search-console',
        ['GOOGLE_SERVICE_ACCOUNT_JSON', 'SEARCH_CONSOLE_SITE_URL'],
        'el paso de Google Search Console',
      ),
    );
  }

  try {
    const authClient = await authCuentaServicio(['https://www.googleapis.com/auth/webmasters.readonly']);
    if (!authClient) throw new Error('sin credenciales válidas');
    const { google } = (await import('googleapis')) as typeof import('googleapis');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sc = google.searchconsole({ version: 'v1', auth: authClient as any });

    const fin = new Date();
    const inicio = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    const resp = await sc.searchanalytics.query({
      siteUrl: site,
      requestBody: {
        startDate: iso(inicio),
        endDate: iso(fin),
        dimensions: ['query'],
        rowLimit: 25,
      },
    });

    const consultas = (resp.data.rows ?? []).map((r) => ({
      consulta: r.keys?.[0],
      clics: r.clicks,
      impresiones: r.impressions,
      ctr: r.ctr,
      posicion: r.position,
    }));

    return guardarMetrica('search-console', { estado: 'ok', site, consultas });
  } catch (e) {
    return guardarMetrica('search-console', {
      estado: 'error',
      mensaje: `No se pudo leer Search Console: ${String(e)}`,
      datos: null,
    });
  }
}
