import type { ContextoEjecucion } from '../lib/contexto';
import { leerPrompt } from '../lib/contexto';
import {
  InformeVerificacionSchema,
  type FichaHechos,
  type InformeVerificacion,
} from '../lib/esquemas';

/** Extrae cifras significativas (números, %, años, importes) de un texto. */
export function extraerCifras(texto: string): string[] {
  const m = texto.match(/\d[\d.,]*\s?(?:%|€|por ciento|euros?)?/gi) ?? [];
  return m.map((s) => s.replace(/\s+/g, '').toLowerCase()).filter((s) => s.length > 0);
}

/**
 * Guardia determinista: toda cifra del cuerpo debe aparecer en la ficha de hechos.
 * Es el muro contra datos inventados y se ejecuta SIEMPRE, también con API.
 */
export function cifrasSinRespaldo(cuerpo: string, ficha: FichaHechos): string[] {
  const textoFicha = [
    ...ficha.hechos.map((h) => `${h.afirmacion} ${h.cita ?? ''}`),
    ...ficha.contexto,
    ...ficha.datosNumericos.map((d) => `${d.valor}${d.unidad ?? ''} ${d.etiqueta}`),
  ]
    .join(' ')
    .replace(/\s+/g, '')
    .toLowerCase();

  const sinRespaldo: string[] = [];
  for (const cifra of extraerCifras(cuerpo)) {
    const soloNumero = cifra.replace(/[^\d.,]/g, '');
    if (soloNumero.length <= 1) continue; // ignora dígitos sueltos triviales
    if (!textoFicha.includes(soloNumero)) sinRespaldo.push(cifra);
  }
  return Array.from(new Set(sinRespaldo));
}

/** Agente 7 — Verificador. */
export async function verificador(
  cuerpo: string,
  ficha: FichaHechos,
  ctx: ContextoEjecucion,
): Promise<InformeVerificacion> {
  ctx.logger.paso('verificador', `Verificando «${ficha.titulo}»`);

  const problemasCifras = cifrasSinRespaldo(cuerpo, ficha).map(
    (c) => `Cifra sin respaldo en la ficha de hechos: "${c}"`,
  );

  if (ctx.sinApi) {
    return InformeVerificacionSchema.parse({
      aprobado: problemasCifras.length === 0,
      problemas: problemasCifras,
    });
  }

  const user = [
    'Ficha de hechos (única verdad permitida):',
    JSON.stringify(ficha, null, 2),
    '',
    'Cuerpo del artículo a verificar:',
    cuerpo,
  ].join('\n');

  const res = await ctx.llm.generarJSON({
    agente: 'verificador',
    modelo: ctx.config.modeloRedaccion,
    system: leerPrompt('7-verificador'),
    user,
    schema: InformeVerificacionSchema,
    maxTokens: 6000,
    articulo: ficha.temaId,
  });

  // Combinamos: el guardia de cifras manda. Si hay cifras sin respaldo, no se aprueba.
  return {
    aprobado: res.aprobado && problemasCifras.length === 0,
    problemas: [...res.problemas, ...problemasCifras],
    cuerpoCorregido: res.cuerpoCorregido,
  };
}
