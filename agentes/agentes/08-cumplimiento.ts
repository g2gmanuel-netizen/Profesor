import type { ContextoEjecucion } from '../lib/contexto';
import { leerPrompt } from '../lib/contexto';
import { InformeCumplimientoSchema, type InformeCumplimiento } from '../lib/esquemas';
import { maxRachaComun, similitud, tokens } from '../lib/util';

const TERMINOS_SENSIBLES = ['suicidio', 'suicida', 'autolesi', 'violaci', 'menor de edad'];
const ALARMISTAS = [
  'no creerás',
  'alucinarás',
  'esto cambiará tu vida',
  'catástrofe',
  'ruina total',
  'el fin de',
  'pánico',
  'desastre absoluto',
];

export interface ResultadoCumplimiento {
  aprobado: boolean;
  motivos: string[];
}

/**
 * Valor añadido mínimo que pide AdSense («contenido de poco valor»): el artículo debe ser
 * algo más que el resumen de otra noticia. Exige cuerpo suficiente, una parte práctica
 * para el lector y al menos un elemento propio de servicio (tabla, pasos o lista de comprobación).
 */
export function revisarValorAnadido(cuerpo: string): string[] {
  const motivos: string[] = [];
  const palabras = cuerpo.split(/\s+/).filter(Boolean).length;
  if (palabras < 700) motivos.push(`Poco valor añadido: solo ${palabras} palabras (mínimo 700).`);
  if (!/^##\s+.*(para ti|qué (puedes|debes) hacer|cómo (saber|comprobar|calcular|pedir|reclamar)|paso)/im.test(cuerpo)) {
    motivos.push('Poco valor añadido: falta una sección práctica («Qué significa para ti», «Qué puedes hacer», pasos…).');
  }
  const tabla = /^\|.*\|\s*$\n^\|\s*:?-{3,}/m.test(cuerpo);
  const pasos = (cuerpo.match(/^\s*\d+\.\s+\S/gm) ?? []).length >= 3;
  const lista = (cuerpo.match(/^\s*[-*]\s+\S/gm) ?? []).length >= 4;
  if (!tabla && !pasos && !lista) {
    motivos.push('Poco valor añadido: falta una tabla, unos pasos numerados o una lista de comprobación propia.');
  }
  return motivos;
}

/** Revisión de cumplimiento determinista y testeable. */
export function revisarCumplimiento(
  titulo: string,
  cuerpo: string,
  textosFuente: string[],
): ResultadoCumplimiento {
  const motivos: string[] = [];
  const tl = cuerpo.toLowerCase();

  // 1. Citas textuales de más de 15 palabras.
  const citas = cuerpo.match(/[«"]([^»"]{1,})[»"]/g) ?? [];
  for (const c of citas) {
    const palabras = c.replace(/[«»"]/g, '').trim().split(/\s+/).filter(Boolean).length;
    if (palabras > 15) motivos.push(`Cita textual demasiado larga (${palabras} palabras).`);
  }

  // 2. Copia excesiva frente a cada texto fuente (racha literal o similitud alta).
  for (const fuente of textosFuente) {
    if (!fuente || fuente.length < 40) continue;
    const racha = maxRachaComun(fuente, cuerpo);
    if (racha >= 15) motivos.push(`Posible copia literal de una fuente (${racha} palabras seguidas).`);
    if (similitud(fuente, cuerpo) >= 0.85) motivos.push('Paráfrasis demasiado cercana a una fuente.');
  }

  // 3. Contenido sensible.
  for (const t of TERMINOS_SENSIBLES) {
    if (tl.includes(t)) motivos.push(`Contenido sensible detectado ("${t}"): requiere tratamiento estricto o exclusión.`);
  }

  // 4. Lenguaje alarmista / sensacionalista.
  for (const a of ALARMISTAS) {
    if (tl.includes(a)) motivos.push(`Lenguaje alarmista detectado ("${a}").`);
  }
  if (/[A-ZÁÉÍÓÚÑ]{6,}/.test(titulo) || /!!+/.test(titulo)) {
    motivos.push('Titular con mayúsculas gritonas o exclamaciones excesivas.');
  }

  // 5. Titular engañoso: al menos una palabra con contenido del titular debe aparecer en el cuerpo.
  const tokensTitulo = tokens(titulo);
  const tokensCuerpo = new Set(tokens(cuerpo));
  const comunes = tokensTitulo.filter((t) => tokensCuerpo.has(t)).length;
  if (tokensTitulo.length > 0 && comunes === 0) {
    motivos.push('El titular parece no corresponderse con el contenido (posible clickbait).');
  }

  // 6. Valor añadido mínimo (AdSense).
  motivos.push(...revisarValorAnadido(cuerpo));

  return { aprobado: motivos.length === 0, motivos };
}

/** Agente 8 — Revisor de cumplimiento. */
export async function cumplimiento(
  titulo: string,
  cuerpo: string,
  textosFuente: string[],
  ctx: ContextoEjecucion,
  articuloId?: string,
): Promise<InformeCumplimiento> {
  ctx.logger.paso('cumplimiento', `Revisando «${titulo}»`);
  const det = revisarCumplimiento(titulo, cuerpo, textosFuente);

  if (ctx.sinApi) {
    return InformeCumplimientoSchema.parse(det);
  }

  const user = [
    `Titular: ${titulo}`,
    '',
    'Cuerpo:',
    cuerpo,
    '',
    'Textos de las fuentes (para comparar posible copia):',
    textosFuente.join('\n---\n'),
  ].join('\n');

  const res = await ctx.llm.generarJSON({
    agente: 'cumplimiento',
    modelo: ctx.config.modeloRapido,
    system: leerPrompt('8-cumplimiento'),
    user,
    schema: InformeCumplimientoSchema,
    maxTokens: 3000,
    articulo: articuloId,
  });

  return {
    aprobado: res.aprobado && det.aprobado,
    motivos: [...res.motivos, ...det.motivos],
  };
}
