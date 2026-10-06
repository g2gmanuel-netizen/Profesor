/**
 * Genera el análisis de Bolsa de la semana: elige una acción de un sector emergente
 * (rota cada semana), descarga datos REALES de Yahoo Finance y el logo de la empresa,
 * y redacta un análisis exhaustivo con propuesta de entrada y disclaimer. Escribe el
 * artículo en src/content/articulos con categoría "bolsa".
 *
 * Requiere ANTHROPIC_API_KEY. Si falta, o si no se pueden obtener datos de mercado,
 * no publica nada (nunca inventamos cifras). La descarga solo funciona con salida a
 * internet (GitHub Actions). Normalmente se lanza desde "Bolsa semanal".
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { stringify } from 'yaml';
import { CONFIG } from '../agentes/config/config';
import { Llm } from '../agentes/lib/anthropic';
import { Logger } from '../agentes/lib/logger';
import { ContadorCostes } from '../agentes/lib/costes';
import { leerPrompt } from '../agentes/lib/contexto';
import {
  objetivoSemana,
  obtenerDatosYahoo,
  descargarLogo,
  componerPortada,
  volcarDatos,
  type DatosAccion,
} from '../agentes/lib/bolsa';

const DIR_ART = resolve(process.cwd(), 'src/content/articulos');

const AnalisisBolsaSchema = z.object({
  titulo: z.string(),
  subtitulo: z.string(),
  tituloSeo: z.string(),
  descripcion: z.string(),
  cuerpoMarkdown: z.string(),
  clavesRapidas: z.array(z.string()),
  precioEntrada: z.string(),
  horizonte: z.string(),
  riesgo: z.string(),
});

function recortar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  return texto.slice(0, max - 1).trimEnd() + '…';
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

const DISCLAIMER =
  '\n\n---\n\n**Aviso importante:** este análisis es contenido divulgativo y educativo. ' +
  'No es asesoramiento financiero, ni una recomendación, ni una incitación a comprar o vender. ' +
  'Invertir en bolsa conlleva riesgo de perder parte o la totalidad del dinero; rendimientos pasados ' +
  'no garantizan rendimientos futuros. Toma tus decisiones por tu cuenta y, si lo necesitas, consulta ' +
  'a un asesor financiero registrado en la CNMV.';

async function main(): Promise<void> {
  if (!CONFIG.anthropicApiKey) {
    // eslint-disable-next-line no-console
    console.log('Sin ANTHROPIC_API_KEY: no se genera análisis de bolsa.');
    process.exit(0);
  }

  const { sector } = objetivoSemana();
  const tickerPref = objetivoSemana().ticker;
  const orden = [tickerPref, ...sector.tickers.filter((t) => t !== tickerPref)];

  // eslint-disable-next-line no-console
  console.log(`Sector de la semana: ${sector.sector}. Probando: ${orden.join(', ')}`);

  let datos: DatosAccion | null = null;
  for (const t of orden) {
    datos = await obtenerDatosYahoo(t);
    if (datos) {
      // eslint-disable-next-line no-console
      console.log(`Datos obtenidos de ${t}.`);
      break;
    }
    // eslint-disable-next-line no-console
    console.log(`  · sin datos para ${t}, probando siguiente…`);
  }

  if (!datos) {
    // eslint-disable-next-line no-console
    console.log('No se pudieron obtener datos de mercado de ninguna acción del sector. No se publica.');
    process.exit(0);
  }

  // eslint-disable-next-line no-console
  console.log(volcarDatos(datos));

  const slug = `bolsa-${slugify(datos.ticker)}-${datos.fechaDatos}`;
  const logo = await descargarLogo(datos.dominio);
  // eslint-disable-next-line no-console
  console.log(logo ? 'Logo de la empresa descargado.' : 'Sin logo de la empresa (portada con ticker).');
  const portada = await componerPortada(datos, logo, slug);

  const logger = new Logger(`bolsa-${datos.fechaDatos}`);
  const costes = new ContadorCostes(CONFIG.presupuestoDiarioUsd);
  const llm = new Llm(costes, logger);

  const user = [
    `Sector emergente de la semana: ${sector.sector}. Por qué es emergente: ${sector.porque}`,
    '',
    'Datos REALES de la acción (única fuente de cifras permitida), de Yahoo Finance:',
    volcarDatos(datos),
    '',
    `Fecha de hoy: ${datos.fechaDatos}.`,
  ].join('\n');

  const res = await llm.generarJSON({
    agente: 'analista-bolsa',
    modelo: CONFIG.modeloRedaccion,
    system: leerPrompt('bolsa'),
    user,
    schema: AnalisisBolsaSchema,
    maxTokens: 8000,
  });

  const fuentes: { titulo: string; url: string; organismo?: string }[] = [
    {
      titulo: `${datos.nombre} (${datos.ticker}) en Yahoo Finance`,
      url: `https://finance.yahoo.com/quote/${encodeURIComponent(datos.ticker)}`,
      organismo: 'Yahoo Finance',
    },
  ];
  if (datos.web && /^https?:\/\//.test(datos.web)) {
    fuentes.push({ titulo: `Web corporativa de ${datos.nombre}`, url: datos.web, organismo: 'Empresa' });
  }

  const frontmatter = {
    titulo: recortar(res.titulo, 140),
    subtitulo: recortar(res.subtitulo, 220),
    tituloSeo: recortar(res.tituloSeo || res.titulo, 65),
    descripcion: recortar(res.descripcion, 165),
    categoria: 'bolsa',
    autor: CONFIG.autor,
    fechaPublicacion: datos.fechaDatos,
    imagen: portada.rutaPublica,
    imagenAlt: portada.alt,
    etiquetas: Array.from(new Set(['bolsa', datos.ticker, ...sector.sector.toLowerCase().split(/\s+y\s+|\s+/).filter((w) => w.length > 3)])).slice(0, 6),
    fuentes,
    clavesRapidas: res.clavesRapidas.slice(0, 5),
    elaboradoConIA: true,
    destacado: true,
    ticker: datos.ticker,
    bolsaMercado: datos.mercado,
    sectorBolsa: sector.sector,
    precioActual: `${datos.precioFmt ?? ''} ${datos.moneda}`.trim(),
    precioEntrada: recortar(res.precioEntrada, 40),
    fechaDatos: datos.fechaDatos,
  };

  const resumenPropuesta = `**Propuesta (divulgativa):** entrada en torno a **${frontmatter.precioEntrada}** · horizonte: ${res.horizonte} · riesgo: ${res.riesgo}.`;
  const cuerpo = `${res.cuerpoMarkdown.trim()}\n\n${resumenPropuesta}${DISCLAIMER}`;

  mkdirSync(DIR_ART, { recursive: true });
  const ruta = resolve(DIR_ART, `${slug}.md`);
  const contenido = `---\n${stringify(frontmatter).trimEnd()}\n---\n\n${cuerpo}\n`;
  writeFileSync(ruta, contenido, 'utf8');

  // eslint-disable-next-line no-console
  console.log(`\n✓ Análisis de bolsa escrito: src/content/articulos/${slug}.md (${datos.ticker})`);
  // eslint-disable-next-line no-console
  console.log(`Gasto de IA: ${costes.gastoDeSesion().toFixed(4)} USD.`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Error generando el análisis de bolsa:', e);
  process.exit(1);
});
