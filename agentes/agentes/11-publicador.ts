import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { stringify } from 'yaml';
import type { ContextoEjecucion } from '../lib/contexto';
import type { ArticuloFinal } from '../lib/esquemas';
import { cargarPublicados, guardarPublicados } from '../lib/publicados';

const DIR_ART = resolve(process.cwd(), 'src/content/articulos');

export interface ResultadoPublicacion {
  rutas: string[];
  resumen: string;
  modo: 'pull_request' | 'commit_directo';
}

/**
 * Agente 11 — Publicador. Escribe cada artículo como Markdown con frontmatter y
 * actualiza datos/publicados.json. El commit o PR lo realiza el workflow de
 * GitHub Actions según REVISION_HUMANA (ver .github/workflows/redaccion.yml).
 */
export function publicador(
  articulos: ArticuloFinal[],
  ctx: ContextoEjecucion,
): ResultadoPublicacion {
  ctx.logger.paso('publicador', `Escribiendo ${articulos.length} artículo(s)`);
  mkdirSync(DIR_ART, { recursive: true });
  const rutas: string[] = [];
  const publicados = cargarPublicados();

  for (const a of articulos) {
    const fm = stringify(a.frontmatter).trimEnd();
    const contenido = `---\n${fm}\n---\n\n${a.cuerpoMarkdown.trim()}\n`;
    const ruta = resolve(DIR_ART, `${a.slug}.md`);
    writeFileSync(ruta, contenido, 'utf8');
    rutas.push(`src/content/articulos/${a.slug}.md`);

    publicados.temas.push({
      id: a.slug,
      titulo: a.frontmatter.titulo,
      slug: a.slug,
      categoria: a.frontmatter.categoria,
      fecha: a.frontmatter.fechaPublicacion,
    });
  }

  guardarPublicados(publicados);

  const modo = ctx.config.revisionHumana ? 'pull_request' : 'commit_directo';
  const resumen = [
    `## Edición de ${new Date().toISOString().slice(0, 10)}`,
    '',
    `Modo: ${modo === 'pull_request' ? 'revisión humana (pull request)' : 'publicación automática'}.`,
    `Artículos: ${articulos.length}.`,
    '',
    ...articulos.map(
      (a) => `- **${a.frontmatter.titulo}** _(${a.frontmatter.categoria})_ — \`${a.slug}.md\``,
    ),
    '',
    `Gasto de IA de esta ejecución: ${ctx.costes.gastoDeSesion().toFixed(4)} USD.`,
  ].join('\n');

  return { rutas, resumen, modo };
}
