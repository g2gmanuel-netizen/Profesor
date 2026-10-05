import type { ContextoEjecucion } from '../lib/contexto';
import { leerPrompt } from '../lib/contexto';
import { FichaHechosSchema, type FichaHechos, type TemaAprobado } from '../lib/esquemas';
import type { FixtureTema } from '../lib/fixtures';

/** Agente 3 — Investigador. Construye la ficha de hechos con cita y URL por dato. */
export async function investigador(
  tema: TemaAprobado,
  ctx: ContextoEjecucion,
  fixture?: FixtureTema,
): Promise<FichaHechos> {
  ctx.logger.paso('investigador', `Investigando «${tema.titulo}»`);

  if (ctx.sinApi) {
    if (!fixture) throw new Error('Modo --sin-api requiere fixture para el investigador.');
    return FichaHechosSchema.parse({
      temaId: tema.id,
      titulo: tema.titulo,
      hechos: fixture.hechos,
      contexto: fixture.contexto,
      fuentes: fixture.fuentes,
      datosNumericos: fixture.datosNumericos,
    });
  }

  const user = [
    `Tema: ${tema.titulo}`,
    `Enfoque: ${tema.enfoque}`,
    `Fuente principal: ${tema.url} (${tema.organismo ?? 'desconocido'})`,
    `Resumen de la fuente: ${tema.resumenFuente}`,
    '',
    'Extrae los hechos verificables con su URL de origen. No inventes datos.',
  ].join('\n');

  return ctx.llm.generarJSON({
    agente: 'investigador',
    modelo: ctx.config.modeloRedaccion,
    system: leerPrompt('3-investigador'),
    user,
    schema: FichaHechosSchema,
    maxTokens: 8000,
    articulo: tema.id,
  });
}
