import { z } from 'zod';
import type { ContextoEjecucion } from '../lib/contexto';
import { leerPrompt } from '../lib/contexto';
import { TemaAprobadoSchema, type Candidato, type TemaAprobado } from '../lib/esquemas';

/** Agente 2 — Editor jefe. Puntúa y selecciona los mejores temas hasta el límite. */
export async function editorJefe(
  candidatos: Candidato[],
  limite: number,
  ctx: ContextoEjecucion,
): Promise<TemaAprobado[]> {
  ctx.logger.paso('editor-jefe', `Puntuando ${candidatos.length} candidatos (límite ${limite})`);
  if (candidatos.length === 0) return [];

  if (ctx.sinApi) {
    // Heurística determinista: prioriza utilidad y oficialidad; riesgo bajo por defecto.
    const puntuados = candidatos.map((c, i) => {
      const esOficial = Boolean(c.organismo);
      const puntuacion = Math.min(10, 7 + (esOficial ? 1.5 : 0) - i * 0.1);
      const tema: TemaAprobado = {
        ...c,
        puntuacion: Math.round(puntuacion * 10) / 10,
        categoria: c.categoriaSugerida,
        enfoque: `Explicar la noticia y traducirla a impacto práctico para el lector (${c.categoriaSugerida}).`,
        anguloUtilidad: 'Qué significa para tu bolsillo y qué puedes hacer.',
        riesgo: 'bajo',
      };
      return tema;
    });
    return puntuados.sort((a, b) => b.puntuacion - a.puntuacion).slice(0, limite);
  }

  const schema = z.object({ aprobados: z.array(TemaAprobadoSchema) });
  const user = [
    ctx.aprendizajes ? `Aprendizajes recientes:\n${ctx.aprendizajes}\n` : '',
    `Límite de artículos a aprobar hoy: ${limite}.`,
    'Candidatos (JSON):',
    JSON.stringify(candidatos, null, 2),
  ].join('\n');
  const res = await ctx.llm.generarJSON({
    agente: 'editor-jefe',
    modelo: ctx.config.modeloRapido,
    system: leerPrompt('2-editor-jefe'),
    user,
    schema,
    maxTokens: 3000,
  });
  return res.aprobados
    .filter((t) => t.riesgo !== 'alto')
    .sort((a, b) => b.puntuacion - a.puntuacion)
    .slice(0, limite);
}
