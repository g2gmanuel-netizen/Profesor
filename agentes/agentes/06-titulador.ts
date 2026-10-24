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
  // Fuera los titulares que empiezan con el nombre de otro medio («El Confidencial: …»):
  // parecen una copia y Google los valora como contenido de poco valor.
  const todos = Array.from(new Set([res.elegido, ...res.alternativos])).filter(Boolean);
  const propios = todos.filter((t) => !empiezaPorMedio(t, ficha.fuentes.map((f) => f.titulo)));
  const candidatos = propios.length ? propios : todos;
  const { elegido, puntuaciones } = elegirMejorTitular(candidatos, entidades, true);
  return {
    ...res,
    elegido,
    subtitulo: acortar(res.subtitulo, 218), // el frontmatter admite máx. 220
    tituloSeo: acortar(res.tituloSeo || elegido, 60),
    alternativos: candidatos.filter((c) => c !== elegido),
    puntuaciones,
  };
}

function acortar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  return texto.slice(0, max - 1).trimEnd() + '…';
}

const LISTA_MEDIOS =
  '(el pa[ií]s|el mundo|abc|la vanguardia|el confidencial|el economista|expansi[oó]n|cinco d[ií]as|rtve(\\.es)?|20 ?minutos|infobae|el espa[nñ]ol|p[uú]blico|eldiario(\\.es)?|europa press|efe|la raz[oó]n|cope|cadena ser|onda cero|negocios\\.com|idealista|el peri[oó]dico|ara|naiz|moncloa\\.com)';
/** El texto es, entero, el nombre de un medio. */
const MEDIO_EXACTO = new RegExp(`^${LISTA_MEDIOS}$`, 'i');
const MEDIO_AL_INICIO = new RegExp(`^${LISTA_MEDIOS}\\b`, 'i');

/** ¿El titular arranca con el nombre de un medio («El Economista: …», «Qué explica RTVE…»)? */
export function empiezaPorMedio(titular: string, titulosFuentes: string[] = []): boolean {
  const t = titular.trim();
  const antesDosPuntos = t.includes(':') ? t.slice(0, t.indexOf(':')).trim() : '';
  if (antesDosPuntos && MEDIO_EXACTO.test(antesDosPuntos)) return true;
  const citado = t.match(/\bqu[eé] (?:explica|dice|cuenta) (.+)$/i)?.[1];
  if (citado && MEDIO_AL_INICIO.test(citado)) return true;
  // Nombres de medio que vienen entre paréntesis al final del título de una fuente: «… (Infobae)».
  const medios = titulosFuentes.map((f) => f.match(/\(([^()]+)\)\s*$/)?.[1]?.trim()).filter(Boolean) as string[];
  return Boolean(antesDosPuntos) && medios.some((m) => antesDosPuntos.toLowerCase() === m.toLowerCase());
}
