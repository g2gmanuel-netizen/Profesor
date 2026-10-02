import { z } from 'zod';
import type { ContextoEjecucion } from '../lib/contexto';
import { leerPrompt } from '../lib/contexto';
import { CandidatoSchema, type Candidato } from '../lib/esquemas';
import { type TemaPublicado, yaPublicado } from '../lib/publicados';
import { FIXTURES } from '../lib/fixtures';

export interface ItemCrudo {
  titulo: string;
  resumen: string;
  url: string;
  organismo?: string;
}

/**
 * Agente 1 — Rastreador. Convierte titulares/resúmenes crudos de las fuentes en
 * candidatos del nicho y descarta lo ya publicado (comparación semántica).
 */
export async function rastreador(
  entrada: ItemCrudo[],
  publicados: TemaPublicado[],
  ctx: ContextoEjecucion,
): Promise<Candidato[]> {
  ctx.logger.paso('rastreador', `Analizando ${ctx.sinApi ? 'fixtures' : entrada.length + ' items'}`);

  let candidatos: Candidato[];

  if (ctx.sinApi) {
    candidatos = FIXTURES.map((f) => f.candidato);
  } else {
    const schema = z.object({ candidatos: z.array(CandidatoSchema) });
    const user = [
      'Items de fuentes (titulo | resumen | url | organismo):',
      ...entrada.slice(0, 40).map((i, n) => `${n + 1}. ${i.titulo} | ${i.resumen} | ${i.url} | ${i.organismo ?? ''}`),
      '',
      `Fecha de hoy: ${new Date().toISOString().slice(0, 10)}.`,
    ].join('\n');
    const res = await ctx.llm.generarJSON({
      agente: 'rastreador',
      modelo: ctx.config.modeloRapido,
      system: leerPrompt('1-rastreador'),
      user,
      schema,
      maxTokens: 3000,
    });
    candidatos = res.candidatos;
  }

  // Descartar lo ya publicado.
  const nuevos = candidatos.filter((c) => !yaPublicado(c.titulo, publicados));
  ctx.logger.info(`${nuevos.length} candidato(s) nuevos de ${candidatos.length}`);
  return nuevos;
}
