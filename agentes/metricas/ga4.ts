import { guardarMetrica, pendiente, authCuentaServicio } from './lib';

/**
 * Recolector de Google Analytics 4 (GA4 Data API, cuenta de servicio).
 * Si falta credencial o falla, deja el bloque "pendiente de conectar".
 */
export async function recolectarGa4(): Promise<string> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return guardarMetrica(
      'ga4',
      pendiente('ga4', ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GA4_PROPERTY_ID'], 'el paso de Google Analytics'),
    );
  }

  try {
    const authClient = await authCuentaServicio(['https://www.googleapis.com/auth/analytics.readonly']);
    if (!authClient) throw new Error('sin credenciales válidas');
    const { google } = (await import('googleapis')) as typeof import('googleapis');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = google.analyticsdata({ version: 'v1beta', auth: authClient as any });

    const resp = await data.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
        ],
      },
    });

    const filas = (resp.data.rows ?? []).map((r) => ({
      fecha: r.dimensionValues?.[0]?.value,
      usuarios: Number(r.metricValues?.[0]?.value ?? 0),
      sesiones: Number(r.metricValues?.[1]?.value ?? 0),
      paginasVistas: Number(r.metricValues?.[2]?.value ?? 0),
      duracionMediaS: Number(r.metricValues?.[3]?.value ?? 0),
    }));

    return guardarMetrica('ga4', { estado: 'ok', propertyId, dias: filas });
  } catch (e) {
    return guardarMetrica('ga4', {
      estado: 'error',
      mensaje: `No se pudo leer GA4: ${String(e)}`,
      datos: null,
    });
  }
}
