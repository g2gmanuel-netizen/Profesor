import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ContextoEjecucion } from '../lib/contexto';
import type { FichaHechos } from '../lib/esquemas';

export interface ResultadoIlustracion {
  imagen: string; // ruta pública, p.ej. /imagenes/slug.svg
  imagenAlt: string;
}

/**
 * Agente 10 — Ilustrador de datos. Genera una imagen propia (SVG, 1200×675):
 * un gráfico de barras si hay datos numéricos, o una portada tipográfica si no.
 * Nunca usa imágenes de terceros. En simulación escribe en datos/simulacion/imagenes
 * para no ensuciar public/.
 */
export function ilustrador(
  ficha: FichaHechos,
  slug: string,
  titulo: string,
  ctx: ContextoEjecucion,
): ResultadoIlustracion {
  ctx.logger.paso('ilustrador', `Imagen para «${titulo}»`);
  const dir = ctx.simulacion
    ? resolve(process.cwd(), 'datos/simulacion/imagenes')
    : resolve(process.cwd(), 'public/imagenes');
  mkdirSync(dir, { recursive: true });
  const ruta = resolve(dir, `${slug}.svg`);

  let svg: string;
  let alt: string;
  if (ficha.datosNumericos.length > 0) {
    svg = graficoBarras(ficha, titulo);
    const fuente = ficha.fuentes[0]?.organismo ?? 'fuente oficial';
    alt = `Gráfico de ${titulo.toLowerCase()} con datos de ${fuente}.`;
  } else {
    svg = portadaTipografica(titulo);
    alt = `Imagen de portada de Bolsillo Diario: ${titulo}.`;
  }

  writeFileSync(ruta, svg, 'utf8');
  return { imagen: `/imagenes/${slug}.svg`, imagenAlt: alt };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function graficoBarras(ficha: FichaHechos, titulo: string): string {
  const datos = ficha.datosNumericos.slice(0, 6);
  const maxValor = Math.max(...datos.map((d) => Math.abs(d.valor)), 1);
  const anchoBarra = 900 / datos.length;
  const barras = datos
    .map((d, i) => {
      const alto = (Math.abs(d.valor) / maxValor) * 320;
      const x = 150 + i * anchoBarra + anchoBarra * 0.15;
      const y = 500 - alto;
      const w = anchoBarra * 0.7;
      return `
      <rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${alto.toFixed(0)}" fill="#0e7a4e" rx="4"/>
      <text x="${(x + w / 2).toFixed(0)}" y="${(y - 12).toFixed(0)}" font-size="26" font-weight="700" fill="#0b5d3b" text-anchor="middle">${esc(String(d.valor))}${esc(d.unidad ?? '')}</text>
      <text x="${(x + w / 2).toFixed(0)}" y="525" font-size="18" fill="#55606e" text-anchor="middle">${esc((d.etiqueta ?? '').slice(0, 16))}</text>`;
    })
    .join('');
  const fuente = ficha.fuentes[0];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="${esc(titulo)}">
  <rect width="1200" height="675" fill="#ffffff"/>
  <text x="60" y="80" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="800" fill="#0b5d3b">${esc(titulo.slice(0, 48))}</text>
  <line x1="150" y1="500" x2="1060" y2="500" stroke="#e2e6ea" stroke-width="2"/>
  ${barras}
  <text x="60" y="640" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#55606e">Fuente: ${esc(fuente?.organismo ?? fuente?.titulo ?? 'fuente oficial')} · Bolsillo Diario</text>
</svg>`;
}

function portadaTipografica(titulo: string): string {
  const palabras = titulo.split(/\s+/);
  const lineas: string[] = [];
  let actual = '';
  for (const p of palabras) {
    if ((actual + ' ' + p).trim().length > 24) {
      lineas.push(actual.trim());
      actual = p;
    } else {
      actual = (actual + ' ' + p).trim();
    }
  }
  if (actual) lineas.push(actual);
  const tspans = lineas
    .slice(0, 4)
    .map((l, i) => `<tspan x="80" dy="${i === 0 ? 0 : 70}">${esc(l)}</tspan>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="${esc(titulo)}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0b5d3b"/><stop offset="1" stop-color="#0e7a4e"/>
  </linearGradient></defs>
  <rect width="1200" height="675" fill="url(#g)"/>
  <text x="80" y="250" font-family="Helvetica, Arial, sans-serif" font-size="58" font-weight="800" fill="#ffffff">${tspans}</text>
  <text x="80" y="620" font-family="Helvetica, Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff" opacity="0.9">Bolsillo Diario</text>
</svg>`;
}
