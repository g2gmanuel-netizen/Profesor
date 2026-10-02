import { guardarMetrica, pendiente } from './lib';

/**
 * Recolector de Google AdSense (AdSense Management API v2).
 * AdSense NO admite cuentas de servicio: usa OAuth con refresh token.
 */
export async function recolectarAdsense(): Promise<string> {
  const { ADSENSE_OAUTH_CLIENT_ID, ADSENSE_OAUTH_CLIENT_SECRET, ADSENSE_REFRESH_TOKEN, ADSENSE_ACCOUNT_ID } =
    process.env;

  if (!ADSENSE_OAUTH_CLIENT_ID || !ADSENSE_OAUTH_CLIENT_SECRET || !ADSENSE_REFRESH_TOKEN || !ADSENSE_ACCOUNT_ID) {
    return guardarMetrica(
      'adsense',
      pendiente(
        'adsense',
        ['ADSENSE_OAUTH_CLIENT_ID', 'ADSENSE_OAUTH_CLIENT_SECRET', 'ADSENSE_REFRESH_TOKEN', 'ADSENSE_ACCOUNT_ID'],
        'el paso de AdSense del panel',
      ),
    );
  }

  try {
    const { google } = (await import('googleapis')) as typeof import('googleapis');
    const oauth2 = new google.auth.OAuth2(ADSENSE_OAUTH_CLIENT_ID, ADSENSE_OAUTH_CLIENT_SECRET);
    oauth2.setCredentials({ refresh_token: ADSENSE_REFRESH_TOKEN });
    const adsense = google.adsense({ version: 'v2', auth: oauth2 });

    const resp = await adsense.accounts.reports.generate({
      account: `accounts/${ADSENSE_ACCOUNT_ID}`,
      dateRange: 'LAST_30_DAYS',
      metrics: [
        'ESTIMATED_EARNINGS',
        'PAGE_VIEWS',
        'IMPRESSIONS',
        'CLICKS',
        'IMPRESSIONS_CTR',
        'PAGE_VIEWS_RPM',
      ],
    });

    return guardarMetrica('adsense', { estado: 'ok', accountId: ADSENSE_ACCOUNT_ID, informe: resp.data });
  } catch (e) {
    return guardarMetrica('adsense', {
      estado: 'error',
      mensaje: `No se pudo leer AdSense: ${String(e)}`,
      datos: null,
    });
  }
}
