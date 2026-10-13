import { z } from 'zod';
import type { ContextoEjecucion } from '../lib/contexto';
import { leerPrompt } from '../lib/contexto';
import { esDuplicado } from '../lib/publicados';
import { TemaAprobadoSchema, type Candidato, type TemaAprobado } from '../lib/esquemas';

/** Quita de la edición los temas que repiten la misma noticia (misma fuente o mismo tema). */
function sinRepetidos(temas: TemaAprobado[]): TemaAprobado[] {
  const out: TemaAprobado[] = [];
  for (const t of temas) {
    const previos = out.map((o) => ({ id: o.id, slug: o.id, titulo: o.titulo, categoria: o.categoria, fecha: '', urls: [o.url] }));
    if (!esDuplicado(t.titulo, t.url, previos)) out.push(t);
  }
  return out;
}

/** Agente 2 — Editor jefe. Puntúa y selecciona los mejores temas hasta el límite. */
export async function editorJefe(
  candidatos: Candidato[],
  limite: number,
  ctx: ContextoEjecucion,
): Promise<TemaAprobado[]> {
  ctx.logger.paso('editor-jefe', `Puntuando ${candidatos.length} candidatos (límite ${limite})`);
  if (candidatos.length === 0) return [];

  // Orden final: mezcla de calidad editorial y potencial viral (50/50).
  const orden = (t: TemaAprobado): number => t.puntuacion * 0.5 + t.viralidad * 0.5;

  if (ctx.sinApi) {
    // Heurística determinista: prioriza utilidad y oficialidad; riesgo bajo por defecto.
    const puntuados = candidatos.map((c, i) => {
      const esOficial = Boolean(c.organismo);
      const puntuacion = Math.min(10, 7 + (esOficial ? 1.5 : 0) - i * 0.1);
      const tema: TemaAprobado = {
        ...c,
        puntuacion: Math.round(puntuacion * 10) / 10,
        viralidad: 5,
        categoria: c.categoriaSugerida,
        enfoque: `Explicar la noticia y traducirla a impacto práctico para el lector (${c.categoriaSugerida}).`,
        anguloUtilidad: 'Qué significa para tu bolsillo y qué puedes hacer.',
        riesgo: 'bajo',
      };
      return tema;
    });
    return puntuados.sort((a, b) => orden(b) - orden(a)).slice(0, limite);
  }

  const schema = z.object({ aprobados: z.array(TemaAprobadoSchema) });
  const user = [
    ctx.aprendizajes ? `Aprendizajes recientes:\n${ctx.aprendizajes}\n` : '',
    ctx.yaPublicados
      ? `YA PUBLICADO EN LA WEB (descarta cualquier candidato que sea la misma noticia, aunque cambie el titular o el enfoque):\n${ctx.yaPublicados}\n`
      : '',
    ctx.tendencias ? `TRENDING TOPICS HOY EN ESPAÑA (úsalo para puntuar la viralidad):\n${ctx.tendencias}\n` : '',
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
    maxTokens: 8000,
  });
  return sinRepetidos(
    res.aprobados.filter((t) => t.riesgo !== 'alto').sort((a, b) => orden(b) - orden(a)),
  ).slice(0, limite);
}
