import type { ContextoEjecucion } from '../lib/contexto';
import { leerPrompt } from '../lib/contexto';
import {
  BorradorSchema,
  type Borrador,
  type BriefLector,
  type FichaHechos,
} from '../lib/esquemas';

/** Agente 5 — Redactor. Escribe SOLO con la ficha de hechos. */
export async function redactor(
  ficha: FichaHechos,
  brief: BriefLector,
  ctx: ContextoEjecucion,
): Promise<Borrador> {
  ctx.logger.paso('redactor', `Redactando «${ficha.titulo}»`);

  if (ctx.sinApi) {
    return BorradorSchema.parse(redactarDeterminista(ficha, brief));
  }

  const user = [
    'Brief de lector (JSON):',
    JSON.stringify(brief, null, 2),
    '',
    'Ficha de hechos (JSON) — ÚNICA fuente permitida de datos:',
    JSON.stringify(ficha, null, 2),
  ].join('\n');

  return ctx.llm.generarJSON({
    agente: 'redactor',
    modelo: ctx.config.modeloRedaccion,
    system: leerPrompt('5-redactor'),
    user,
    schema: BorradorSchema,
    maxTokens: 4096,
    articulo: ficha.temaId,
  });
}

/**
 * Redacción determinista para modo simulación: construye el artículo únicamente
 * con las afirmaciones de la ficha y texto de servicio genérico (sin datos nuevos),
 * de modo que supere al verificador sin gastar API.
 */
function redactarDeterminista(ficha: FichaHechos, brief: BriefLector): Borrador {
  const hechos = ficha.hechos.map((h) => h.afirmacion);
  const entradilla = `${hechos[0] ?? ficha.titulo} Te explicamos qué significa y qué puedes hacer.`;

  const partes: string[] = [];
  partes.push(entradilla);

  partes.push('\n## Qué ha pasado\n');
  partes.push(hechos.join(' '));

  if (ficha.contexto.length > 0) {
    partes.push('\n## Para ponerlo en contexto\n');
    partes.push(ficha.contexto.join(' '));
  }

  partes.push('\n## Qué significa para ti\n');
  partes.push(
    `${brief.anguloServicio} Antes de tomar cualquier decisión, conviene mirar tu caso concreto: ` +
      'revisa las condiciones que ya tienes, compara con las alternativas disponibles y calcula el ' +
      'efecto real en tus cuentas mensuales. Si tienes dudas sobre cómo te afecta, apóyate en las ' +
      'fuentes oficiales enlazadas al final y, cuando la decisión sea importante, consulta con un ' +
      'profesional. La clave es no actuar por impulso: entender primero el dato y después valorar, ' +
      'con calma, si te compensa cambiar algo o mantener lo que tienes.',
  );

  partes.push('\n## En resumen\n');
  partes.push(
    'Esta es una noticia de servicio: lo importante no es solo el dato, sino cómo se traduce en tu ' +
      'día a día. Hemos resumido lo esencial para que puedas decidir con información y sin ruido.',
  );

  const cuerpoMarkdown = partes.join('\n');

  const clavesRapidas = [
    hechos[0] ?? ficha.titulo,
    hechos[1] ?? brief.loQueNecesitaPrimero,
    brief.anguloServicio,
  ].filter(Boolean);

  return {
    titulo: ficha.titulo,
    entradilla,
    cuerpoMarkdown,
    clavesRapidas,
  };
}
