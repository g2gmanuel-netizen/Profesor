import type { ContextoEjecucion } from '../lib/contexto';
import { leerPrompt } from '../lib/contexto';
import {
  TitularesSchema,
  type Borrador,
  type FichaHechos,
  type Titulares,
} from '../lib/esquemas';
import { elegirMejorTitular } from '../lib/rubrica';

/** Agente 6 — Titulador. Genera titulares y elige el mejor con la rúbrica. */
export async function titulador(
  borrador: Borrador,
  ficha: FichaHechos,
  ctx: ContextoEjecucion,
  candidatosFixture: string[] = [],
): Promise<Titulares> {
  ctx.logger.paso('titulador', `Titulando «${ficha.titulo}»`);

  const entidades = Array.from(
    new Set([
      ...ficha.fuentes.map((f) => f.organismo ?? '').filter(Boolean),
      ...ficha.datosNumericos.map((d) => d.etiqueta.split(' ')[0] ?? ''),
    ]),
  ).filter(Boolean) as string[];

  if (ctx.sinApi) {
    const candidatos = Array.from(new Set([borrador.titulo, ...candidatosFixture])).filter(Boolean);
    const { elegido, puntuaciones } = elegirMejorTitular(candidatos, entidades, true);
    const subtitulo = acortar(borrador.entradilla, 200);
    return TitularesSchema.parse({
      elegido,
      subtitulo,
      tituloSeo: acortar(elegido, 60),
      textoRedes: acortar(elegido, 180),
      alternativos: candidatos.filter((c) => c !== elegido),
      puntuaciones,
    });
  }

  const user = [
    ctx.aprendizajes ? `Aprendizajes:\n${ctx.aprendizajes}\n` : '',
    `Entidades/temas clave que deberían aparecer: ${entidades.join(', ') || '(ninguna específica)'}`,
    '',
    'Borrador (JSON):',
    JSON.stringify(borrador, null, 2),
  ].join('\n');

  const res = await ctx.llm.generarJSON({
    agente: 'titulador',
    modelo: ctx.config.modeloRedaccion,
    system: leerPrompt('6-titulador'),
    user,
    schema: TitularesSchema,
    maxTokens: 3000,
    articulo: ficha.temaId,
  });

  // Reforzamos la elección con la rúbrica determinista sobre los candidatos propuestos.
  const candidatos = Array.from(new Set([res.elegido, ...res.alternativos])).filter(Boolean);
  const { elegido, puntuaciones } = elegirMejorTitular(candidatos, entidades, true);
  return {
    ...res,
    elegido,
    tituloSeo: acortar(res.tituloSeo || elegido, 60),
    alternativos: candidatos.filter((c) => c !== elegido),
    puntuaciones,
  };
}

function acortar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  return texto.slice(0, max - 1).trimEnd() + '…';
}
