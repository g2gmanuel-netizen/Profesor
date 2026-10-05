import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

/**
 * Datos de mercado reales para la sección de Bolsa. Se obtienen de Yahoo Finance
 * (endpoints públicos query1/query2) usando el flujo cookie + crumb que exige hoy.
 * Si algo falla, las funciones devuelven null y el script de bolsa no publica nada
 * (nunca inventamos cifras). La descarga solo funciona con salida a internet
 * (GitHub Actions), no en el entorno de desarrollo con proxy restringido.
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export interface SectorObjetivo {
  sector: string;
  porque: string;
  tickers: string[];
}

/** Sectores emergentes en rotación: uno distinto cada semana. */
export const SECTORES_EMERGENTES: SectorObjetivo[] = [
  {
    sector: 'Inteligencia artificial y semiconductores',
    porque: 'La demanda de chips y cómputo para IA está redibujando la industria tecnológica.',
    tickers: ['NVDA', 'AMD', 'TSM', 'AVGO', 'ARM'],
  },
  {
    sector: 'Energía limpia y solar',
    porque: 'La transición energética impulsa la inversión en renovables a escala global.',
    tickers: ['ENPH', 'FSLR', 'NEE', 'SEDG', 'RUN'],
  },
  {
    sector: 'Ciberseguridad',
    porque: 'El aumento de ciberataques convierte la seguridad en un gasto prioritario.',
    tickers: ['CRWD', 'PANW', 'ZS', 'FTNT', 'S'],
  },
  {
    sector: 'Vehículo eléctrico y baterías',
    porque: 'La electrificación del transporte abre un mercado enorme pero muy competido.',
    tickers: ['TSLA', 'RIVN', 'ALB', 'LCID', 'BYDDY'],
  },
  {
    sector: 'Biotecnología y salud genómica',
    porque: 'Nuevas terapias y edición genética prometen cambiar la medicina.',
    tickers: ['CRSP', 'VRTX', 'MRNA', 'NTLA', 'BEAM'],
  },
  {
    sector: 'Robótica y automatización',
    porque: 'La automatización gana peso ante la escasez de mano de obra y el coste laboral.',
    tickers: ['ISRG', 'ABB', 'ROK', 'PATH', 'TER'],
  },
  {
    sector: 'Computación cuántica',
    porque: 'Una tecnología temprana con potencial disruptivo y mucha volatilidad.',
    tickers: ['IONQ', 'RGTI', 'QBTS', 'IBM'],
  },
  {
    sector: 'Espacio y defensa',
    porque: 'El acceso privado al espacio y el gasto en defensa marcan un ciclo al alza.',
    tickers: ['RKLB', 'LMT', 'RTX', 'ASTS'],
  },
  {
    sector: 'Fintech y pagos digitales',
    porque: 'El pago digital y las finanzas sin banca tradicional siguen ganando terreno.',
    tickers: ['SQ', 'PYPL', 'ADYEY', 'SOFI', 'NU'],
  },
  {
    sector: 'Nube y software empresarial',
    porque: 'El software por suscripción sostiene márgenes altos y crecimiento recurrente.',
    tickers: ['SNOW', 'DDOG', 'NET', 'MDB', 'CRM'],
  },
];

/** Número de semana ISO, para rotar sector y acción de forma determinista. */
export function semanaISO(fecha: Date): number {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const inicioAnio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - inicioAnio.getTime()) / 86400000 + 1) / 7);
}

/** Elige el sector de la semana y, dentro de él, una acción (rota por semana). */
export function objetivoSemana(fecha = new Date()): { sector: SectorObjetivo; ticker: string } {
  const semana = semanaISO(fecha);
  const sector = SECTORES_EMERGENTES[semana % SECTORES_EMERGENTES.length]!;
  const ticker = sector.tickers[Math.floor(semana / SECTORES_EMERGENTES.length) % sector.tickers.length]!;
  return { sector, ticker };
}

type Campo = { raw?: number; fmt?: string } | undefined;
const raw = (c: Campo): number | undefined => (c && typeof c.raw === 'number' ? c.raw : undefined);
const fmt = (c: Campo): string | undefined => (c && c.fmt ? c.fmt : undefined);

export interface DatosAccion {
  ticker: string;
  nombre: string;
  moneda: string;
  mercado: string; // exchange
  sector?: string;
  industria?: string;
  web?: string;
  dominio?: string;
  resumenNegocio?: string;
  precio?: number;
  precioFmt?: string;
  cambioPctFmt?: string;
  marketCapFmt?: string;
  perTrailing?: string;
  perForward?: string;
  crecimientoIngresosFmt?: string;
  margenBrutoFmt?: string;
  margenNetoFmt?: string;
  ingresosFmt?: string;
  deudaEbitda?: string;
  beta?: string;
  max52Fmt?: string;
  min52Fmt?: string;
  recomendacion?: string; // strong_buy, buy, hold...
  numAnalistas?: number;
  objetivoMedioFmt?: string;
  objetivoAltoFmt?: string;
  objetivoBajoFmt?: string;
  objetivoMedio?: number;
  fechaDatos: string;
}

/** Obtiene cookie + crumb de Yahoo (necesarios para quoteSummary). */
async function cookieYCrumb(): Promise<{ cookie: string; crumb: string } | null> {
  try {
    const r1 = await fetch('https://fc.yahoo.com/', { headers: { 'User-Agent': UA } });
    const h = r1.headers as unknown as { getSetCookie?: () => string[] };
    const setCookie =
      (typeof h.getSetCookie === 'function' ? h.getSetCookie().join('; ') : '') ||
      r1.headers.get('set-cookie') ||
      '';
    const cookie = setCookie.split(';')[0] ?? '';
    if (!cookie) return null;
    const r2 = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Cookie: cookie },
    });
    const crumb = (await r2.text()).trim();
    if (!crumb || crumb.length > 40 || crumb.includes('<')) return null;
    return { cookie, crumb };
  } catch {
    return null;
  }
}

/** Precio actual vía chart (no requiere crumb); fallback robusto. */
async function precioChart(ticker: string): Promise<{ precio?: number; moneda?: string; mercado?: string }> {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=5d&interval=1d`,
      { headers: { 'User-Agent': UA } },
    );
    if (!r.ok) return {};
    const j = (await r.json()) as {
      chart?: { result?: { meta?: { regularMarketPrice?: number; currency?: string; fullExchangeName?: string } }[] };
    };
    const meta = j.chart?.result?.[0]?.meta;
    return { precio: meta?.regularMarketPrice, moneda: meta?.currency, mercado: meta?.fullExchangeName };
  } catch {
    return {};
  }
}

const MAP_RECO: Record<string, string> = {
  strong_buy: 'Compra fuerte',
  buy: 'Compra',
  hold: 'Mantener',
  underperform: 'Peor que el mercado',
  sell: 'Venta',
};

/** Trae los datos de mercado reales de una acción. Devuelve null si no se puede. */
export async function obtenerDatosYahoo(ticker: string): Promise<DatosAccion | null> {
  const cc = await cookieYCrumb();
  const chart = await precioChart(ticker);
  let qs: Record<string, unknown> | null = null;
  if (cc) {
    try {
      const modulos = 'price,summaryDetail,financialData,defaultKeyStatistics,assetProfile,recommendationTrend';
      const url =
        `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}` +
        `?modules=${modulos}&crumb=${encodeURIComponent(cc.crumb)}`;
      const r = await fetch(url, { headers: { 'User-Agent': UA, Cookie: cc.cookie } });
      if (r.ok) {
        const j = (await r.json()) as { quoteSummary?: { result?: Record<string, unknown>[] } };
        qs = j.quoteSummary?.result?.[0] ?? null;
      }
    } catch {
      qs = null;
    }
  }

  // Sin precio no publicamos.
  const price = (qs?.price ?? {}) as Record<string, Campo> & { currency?: string; exchangeName?: string; longName?: string; shortName?: string };
  const precio = raw(price.regularMarketPrice) ?? chart.precio;
  if (precio === undefined) return null;

  const sd = (qs?.summaryDetail ?? {}) as Record<string, Campo>;
  const fd = (qs?.financialData ?? {}) as Record<string, Campo> & { recommendationKey?: string };
  const ks = (qs?.defaultKeyStatistics ?? {}) as Record<string, Campo>;
  const ap = (qs?.assetProfile ?? {}) as { website?: string; sector?: string; industry?: string; longBusinessSummary?: string };

  const web = ap.website;
  const dominio = web ? web.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '') : undefined;

  return {
    ticker: ticker.toUpperCase(),
    nombre: price.longName ?? price.shortName ?? ticker.toUpperCase(),
    moneda: price.currency ?? chart.moneda ?? 'USD',
    mercado: price.exchangeName ?? chart.mercado ?? 'N/D',
    sector: ap.sector,
    industria: ap.industry,
    web,
    dominio,
    resumenNegocio: ap.longBusinessSummary,
    precio,
    precioFmt: fmt(price.regularMarketPrice) ?? `${precio.toFixed(2)}`,
    cambioPctFmt: fmt(price.regularMarketChangePercent),
    marketCapFmt: fmt(price.marketCap) ?? fmt(sd.marketCap),
    perTrailing: fmt(sd.trailingPE),
    perForward: fmt(sd.forwardPE) ?? fmt(ks.forwardPE),
    crecimientoIngresosFmt: fmt(fd.revenueGrowth),
    margenBrutoFmt: fmt(fd.grossMargins),
    margenNetoFmt: fmt(fd.profitMargins),
    ingresosFmt: fmt(fd.totalRevenue),
    deudaEbitda: fmt(fd.debtToEquity),
    beta: fmt(sd.beta) ?? fmt(ks.beta),
    max52Fmt: fmt(sd.fiftyTwoWeekHigh),
    min52Fmt: fmt(sd.fiftyTwoWeekLow),
    recomendacion: fd.recommendationKey ? (MAP_RECO[fd.recommendationKey] ?? fd.recommendationKey) : undefined,
    numAnalistas: raw(fd.numberOfAnalystOpinions),
    objetivoMedioFmt: fmt(fd.targetMeanPrice),
    objetivoAltoFmt: fmt(fd.targetHighPrice),
    objetivoBajoFmt: fmt(fd.targetLowPrice),
    objetivoMedio: raw(fd.targetMeanPrice),
    fechaDatos: new Date().toISOString().slice(0, 10),
  };
}

/** Descarga el logo de la empresa (Clearbit). Devuelve el buffer PNG o null. */
export async function descargarLogo(dominio: string | undefined): Promise<Buffer | null> {
  if (!dominio) return null;
  try {
    const r = await fetch(`https://logo.clearbit.com/${encodeURIComponent(dominio)}?size=256`, {
      headers: { 'User-Agent': UA },
    });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.length > 200 ? buf : null;
  } catch {
    return null;
  }
}

/**
 * Compone la portada 1200x675: fondo degradado + tarjeta blanca con el logo de la
 * empresa (si lo hay) + ticker, nombre y sector. Escribe un .jpg y devuelve su ruta.
 */
export async function componerPortada(
  d: DatosAccion,
  logo: Buffer | null,
  slug: string,
  ctx: { simulacion?: boolean } = {},
): Promise<{ rutaPublica: string; alt: string }> {
  const dir = ctx.simulacion
    ? resolve(process.cwd(), 'datos/simulacion/imagenes/bolsa')
    : resolve(process.cwd(), 'public/imagenes/bolsa');
  mkdirSync(dir, { recursive: true });

  const esc = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const nombre = esc(d.nombre.length > 34 ? d.nombre.slice(0, 33) + '…' : d.nombre);
  const sector = esc((d.sector ?? '').length > 46 ? (d.sector ?? '').slice(0, 45) + '…' : d.sector ?? '');

  const fondo = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a4d5c"/><stop offset="1" stop-color="#0e7490"/>
    </linearGradient></defs>
    <rect width="1200" height="675" fill="url(#g)"/>
    <rect x="0" y="0" width="1200" height="10" fill="#ffffff" opacity="0.85"/>
    <text x="70" y="90" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="26" font-weight="700" fill="#bfe6ef" letter-spacing="2">BOLSILLO DIARIO · BOLSA</text>
    <rect x="70" y="190" width="300" height="300" rx="28" fill="#ffffff"/>
    <text x="410" y="300" font-family="Georgia, 'DejaVu Serif', serif" font-size="78" font-weight="800" fill="#ffffff">${esc(d.ticker)}</text>
    <text x="414" y="360" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="34" fill="#eafaf1">${nombre}</text>
    <text x="414" y="410" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="26" fill="#bfe6ef">${sector}</text>
    <text x="414" y="470" font-family="Arial, 'DejaVu Sans', sans-serif" font-size="24" fill="#9fd4e2">${esc(d.mercado)} · ${esc(d.precioFmt ?? '')} ${esc(d.moneda)}</text>
  </svg>`;

  let base = sharp(Buffer.from(fondo));
  if (logo) {
    try {
      const logoFit = await sharp(logo)
        .resize(240, 240, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toBuffer();
      const meta = await sharp(logoFit).metadata();
      const left = 70 + Math.round((300 - (meta.width ?? 240)) / 2);
      const top = 190 + Math.round((300 - (meta.height ?? 240)) / 2);
      base = sharp(await base.png().toBuffer()).composite([{ input: logoFit, left, top }]);
    } catch {
      // si el logo no se puede componer, se queda la tarjeta blanca con el ticker ya visible
    }
  }
  if (!logo) {
    // Sin logo: pon el ticker dentro de la tarjeta blanca.
    const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><text x="150" y="175" text-anchor="middle" font-family="Georgia,'DejaVu Serif',serif" font-size="64" font-weight="800" fill="#0a4d5c">${esc(d.ticker)}</text></svg>`;
    base = sharp(await base.png().toBuffer()).composite([{ input: Buffer.from(overlay), left: 70, top: 190 }]);
  }

  const ruta = resolve(dir, `${slug}.jpg`);
  await base.jpeg({ quality: 86 }).toFile(ruta);
  return {
    rutaPublica: `/imagenes/bolsa/${slug}.jpg`,
    alt: `Portada del análisis de ${d.nombre} (${d.ticker}) en el sector ${d.sector ?? 'cotizado'}.`,
  };
}

/** Escribe un JSON de depuración con los datos (útil en los logs del workflow). */
export function volcarDatos(d: DatosAccion): string {
  return JSON.stringify(d, null, 2);
}
