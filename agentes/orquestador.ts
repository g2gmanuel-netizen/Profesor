import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { stringify } from 'yaml';
import { crearContexto } from './lib/contexto';
import { PresupuestoExcedidoError } from './lib/costes';
import { cargarFuentes, leerFeed } from './lib/fuentes';
import { cargarPublicados } from './lib/publicados';
import { FIXTURES } from './lib/fixtures';
import { slugify } from './lib/util';
import type { ArticuloFinal } from './lib/esquemas';

import { rastreador, type ItemCrudo } from './agentes/01-rastreador';
import { editorJefe } from './agentes/02-editor-jefe';
import { investigador } from './agentes/03-investigador';
import { analistaAudiencia } from './agentes/04-analista-audiencia';
import { redactor } from './agentes/05-redactor';
import { titulador } from './agentes/06-titulador';
import { verificador } from './agentes/07-verificador';
import { cumplimiento } from './agentes/08-cumplimiento';
import { seoDiscover } from './agentes/09-seo-discover';
import { ilustrador } from './agentes/10-ilustrador';
import { publicador } from './agentes/11-publicador';
import { analistaRendimiento } from './agentes/12-analista-rendimiento';

interface Opciones {
  simulacion: boolean;
  sinApi: boolean;
  semanal: boolean;
}

function parsearArgs(): Opciones {
  const args = process.argv.slice(2);
  return {
    simulacion: args.includes('--simulacion'),
    sinApi: args.includes('--sin-api'),
    semanal: args.includes('--semanal'),
  };
}

async function recopilarItems(): Promise<ItemCrudo[]> {
  const { fuentes } = cargarFuentes();
  const items: ItemCrudo[] = [];
  const conRss = fuentes.filter((f) => f.rss);
  const resultados = await Promise.all(
    conRss.map(async (f) => ({ f, feed: await leerFeed(f.rss!) })),
  );
  for (const { f, feed } of resultados) {
    if (!feed) {
      // eslint-disable-next-line no-console
      console.log(`  · Fuente caída o sin respuesta: ${f.nombre}`);
      continue;
    }
    for (const it of feed.slice(0, 15)) {
      items.push({ titulo: it.titulo, resumen: it.resumen, url: it.enlace, organismo: f.organismo });
    }
  }
  return items;
}

async function main(): Promise<void> {
  const opts = parsearArgs();
  const ejecucionId = `${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const ctx = crearContexto({ ejecucionId, sinApi: opts.sinApi, simulacion: opts.simulacion });

  // eslint-disable-next-line no-console
  console.log(
    `\n=== Bolsillo Diario · redacción ===\nModo: ${opts.semanal ? 'ANALISTA SEMANAL' : 'REDACCIÓN'}` +
      `${opts.simulacion ? ' · simulación' : ''}${opts.sinApi ? ' · sin API' : ''}\n`,
  );

  if (opts.semanal) {
    const a = await analistaRendimiento(ctx);
    // eslint-disable-next-line no-console
    console.log(`Aprendizajes actualizados: ${a.reglas.length} reglas, ${a.temasEvergreen.length} temas evergreen.`);
    return;
  }

  try {
    const publicados = cargarPublicados();

    // 1. Rastreador
    const items = opts.sinApi ? [] : await recopilarItems();
    const candidatos = await rastreador(items, publicados.temas, ctx);
    if (candidatos.length === 0) {
      // eslint-disable-next-line no-console
      console.log('No hay candidatos nuevos. Fin de la ejecución.');
      return;
    }

    // 2. Editor jefe
    const limite = opts.simulacion
      ? Math.min(ctx.config.articulosMaxDia, candidatos.length)
      : ctx.config.articulosMaxDia;
    const temas = await editorJefe(candidatos, limite, ctx);
    ctx.logger.info(`${temas.length} tema(s) aprobados.`);

    const existentes = publicados.temas.map((p) => ({
      slug: p.slug,
      titulo: p.titulo,
      categoria: p.categoria,
      etiquetas: [] as string[],
    }));

    const finales: ArticuloFinal[] = [];
    const rechazados: { titulo: string; motivo: string }[] = [];

    for (const tema of temas) {
      try {
        const fixture = FIXTURES.find((f) => f.candidato.id === tema.id);

        // 3. Investigador
        const ficha = await investigador(tema, ctx, fixture);

        // 4. Analista de audiencia
        const brief = await analistaAudiencia(ficha, ctx);

        // 5. Redactor
        const borrador = await redactor(ficha, brief, ctx);

        // 6. Titulador
        const tit = await titulador(borrador, ficha, ctx, fixture?.titularesAlternativos ?? []);

        // 7. Verificador (máximo 2 vueltas)
        let cuerpo = borrador.cuerpoMarkdown;
        let aprobadoVerif = false;
        for (let vuelta = 1; vuelta <= 2; vuelta++) {
          const inf = await verificador(cuerpo, ficha, ctx);
          if (inf.aprobado) {
            aprobadoVerif = true;
            break;
          }
          if (inf.cuerpoCorregido) {
            cuerpo = inf.cuerpoCorregido;
          } else {
            ctx.logger.registrar({
              agente: 'verificador',
              estado: 'rechazado',
              duracionMs: 0,
              motivo: inf.problemas.join('; '),
              articulo: tema.id,
            });
            rechazados.push({ titulo: tema.titulo, motivo: `Verificación: ${inf.problemas.join('; ')}` });
            break;
          }
        }
        if (!aprobadoVerif) continue;

        // 8. Cumplimiento
        const textosFuente = [
          tema.resumenFuente,
          ...ficha.hechos.map((h) => h.cita ?? ''),
          ...ficha.contexto,
        ].filter(Boolean);
        const cmp = await cumplimiento(tit.elegido, cuerpo, textosFuente, ctx, tema.id);
        if (!cmp.aprobado) {
          ctx.logger.registrar({
            agente: 'cumplimiento',
            estado: 'rechazado',
            duracionMs: 0,
            motivo: cmp.motivos.join('; '),
            articulo: tema.id,
          });
          rechazados.push({ titulo: tema.titulo, motivo: `Cumplimiento: ${cmp.motivos.join('; ')}` });
          continue;
        }

        // 10. Ilustrador (antes del SEO para tener la ruta de imagen)
        const img = await ilustrador(ficha, slugify(tit.elegido), tit.elegido, tema.categoria, ctx);

        // 9. SEO y Discover
        const final = seoDiscover(
          {
            tema,
            ficha,
            borrador: { ...borrador, cuerpoMarkdown: cuerpo },
            titulares: tit,
            cuerpoFinal: cuerpo,
            etiquetas: fixture?.etiquetas ?? [tema.categoria],
            imagen: img.imagen,
            imagenAlt: img.imagenAlt,
            imagenCredito: img.imagenCredito,
            autor: ctx.config.autor,
            existentes,
          },
          ctx,
        );

        finales.push(final);
        ctx.logger.registrar({
          agente: 'pipeline',
          estado: 'ok',
          duracionMs: 0,
          articulo: final.slug,
        });
      } catch (e) {
        if (e instanceof PresupuestoExcedidoError) throw e;
        ctx.logger.info(`Error procesando «${tema.titulo}»: ${String(e)}`);
        rechazados.push({ titulo: tema.titulo, motivo: String(e) });
      }
    }

    // 11. Publicador o, en simulación, volcado a datos/simulacion.
    if (opts.simulacion) {
      volcarSimulacion(finales);
    } else if (finales.length > 0) {
      const res = publicador(finales, ctx);
      escribirResumen(res.resumen);
    } else {
      escribirResumen(
        `## Edición de ${new Date().toISOString().slice(0, 10)}\n\nSin artículos nuevos que publicar hoy.\n`,
      );
    }

    resumenFinal(finales, rechazados, ctx.costes.gastoDeSesion(), opts);
  } catch (e) {
    if (e instanceof PresupuestoExcedidoError) {
      // eslint-disable-next-line no-console
      console.error(`\n⛔ ${e.message} Ejecución detenida para no superar el presupuesto.`);
      process.exitCode = 0;
      return;
    }
    throw e;
  }
}

function volcarSimulacion(finales: ArticuloFinal[]): void {
  const dir = resolve(process.cwd(), 'datos/simulacion');
  mkdirSync(dir, { recursive: true });
  for (const a of finales) {
    const fm = stringify(a.frontmatter).trimEnd();
    writeFileSync(resolve(dir, `${a.slug}.md`), `---\n${fm}\n---\n\n${a.cuerpoMarkdown.trim()}\n`, 'utf8');
  }
}

function escribirResumen(resumen: string): void {
  const dir = resolve(process.cwd(), 'datos');
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'resumen-edicion.md'), resumen, 'utf8');
}

function resumenFinal(
  finales: ArticuloFinal[],
  rechazados: { titulo: string; motivo: string }[],
  gasto: number,
  opts: Opciones,
): void {
  // eslint-disable-next-line no-console
  const log = console.log;
  log('\n--- Resumen de la ejecución ---');
  log(`Artículos que superan verificador y cumplimiento: ${finales.length}`);
  for (const f of finales) log(`  ✓ ${f.frontmatter.titulo} (${f.slug})`);
  if (rechazados.length) {
    log(`Rechazados: ${rechazados.length}`);
    for (const r of rechazados) log(`  ✗ ${r.titulo} — ${r.motivo}`);
  }
  log(`Gasto de IA de la sesión: ${gasto.toFixed(4)} USD`);
  if (opts.simulacion) log('Modo simulación: no se ha publicado nada (salida en datos/simulacion/).');
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Error fatal en el orquestador:', e);
  process.exit(1);
});
