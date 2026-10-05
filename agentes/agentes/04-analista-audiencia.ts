import type { ContextoEjecucion } from '../lib/contexto';
import { leerPrompt } from '../lib/contexto';
import { BriefLectorSchema, type BriefLector, type FichaHechos } from '../lib/esquemas';

/** Agente 4 — Analista de audiencia. Define al lector y el ángulo de utilidad. */
export async function analistaAudiencia(
  ficha: FichaHechos,
  ctx: ContextoEjecucion,
): Promise<BriefLector> {
  ctx.logger.paso('analista-audiencia', `Brief de lector para «${ficha.titulo}»`);

  if (ctx.sinApi) {
    return BriefLectorSchema.parse({
      perfil:
        'Persona adulta en España preocupada por cómo esta noticia afecta a su economía doméstica.',
      preguntaPrincipal: `¿Qué significa «${ficha.titulo}» para mi dinero?`,
      loQueNecesitaPrimero: 'El dato clave y su efecto directo en el bolsillo, desde el primer párrafo.',
      dudasRestantes: ['¿Tengo que hacer algo?', '¿Desde cuándo me afecta?', '¿A quién afecta más?'],
      anguloServicio: 'Traducir la noticia a euros concretos y pasos prácticos.',
    });
  }

  const user = [
    ctx.aprendizajes ? `Aprendizajes:\n${ctx.aprendizajes}\n` : '',
    'Ficha de hechos (JSON):',
    JSON.stringify(ficha, null, 2),
  ].join('\n');

  return ctx.llm.generarJSON({
    agente: 'analista-audiencia',
    modelo: ctx.config.modeloRapido,
    system: leerPrompt('4-analista-audiencia'),
    user,
    schema: BriefLectorSchema,
    maxTokens: 3000,
    articulo: ficha.temaId,
  });
}
