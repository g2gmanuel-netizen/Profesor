import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ContextoEjecucion } from '../lib/contexto';
import type { FichaHechos } from '../lib/esquemas';
import { portadaSVG, graficoBarrasSVG } from '../lib/portada';
import { z } from 'zod';
import { descargarFoto, busquedaParaArticulo, hayClaveFotos } from '../lib/fotos';
import { categoriaPorSlug, colorCategoria } from '../../src/lib/sitio';

export interface ResultadoIlustracion {
  imagen: string; // ruta pública, p.ej. /imagenes/slug.svg o .jpg
  imagenAlt: string;
  imagenCredito?: string;
}

/**
 * Búsquedas para el banco de fotos que describen literalmente el contenido de la noticia
 * (lo que se vería en una foto: «olive oil bottle», «wall clock», «train tracks»…),
 * para que la portada tenga sentido con lo que se cuenta y no sea un recurso genérico.
 */
async function consultasLiterales(ficha: FichaHechos, titulo: string, ctx: ContextoEjecucion): Promise<string[]> {
  if (ctx.sinApi) return [];
  try {
    const res = await ctx.llm.generarJSON({
      agente: 'ilustrador',
      modelo: ctx.config.modeloRapido,
      system:
        'Eliges la foto de portada de una noticia de un medio español en un banco de fotos (Pixabay). ' +
        'Devuelve 3 búsquedas en inglés, de 2 a 4 palabras, que describan un OBJETO o ESCENA concreta que ' +
        'aparezca literalmente en la noticia (p. ej. "olive oil bottle", "wall clock", "high speed train", ' +
        '"hospital corridor"). Nada genérico (dinero, calculadora, monedas, llaves, hucha, gráfico) salvo que ' +
        'la noticia trate exactamente de eso. Sin nombres de personas, marcas ni lugares fuera de España. ' +
        'Devuelve JSON: { "consultas": ["...", "...", "..."] }.',
      user: `Titular: ${titulo}\n\nHechos:\n${ficha.hechos.map((h) => `- ${h.afirmacion}`).join('\n')}`,
      schema: z.object({ consultas: z.array(z.string()).max(5) }),
      maxTokens: 300,
    });
    return res.consultas.map((c) => c.trim()).filter(Boolean).slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Agente 10 — Ilustrador de datos. Genera una imagen propia (SVG, 1200×675):
 * un gráfico de barras si hay datos numéricos, o una portada tipográfica con el
 * color de la sección si no. Nunca usa imágenes de terceros. En simulación escribe
 * en datos/simulacion/imagenes para no ensuciar public/.
 */
export async function ilustrador(
  ficha: FichaHechos,
  slug: string,
  titulo: string,
  categoria: string,
  ctx: ContextoEjecucion,
): Promise<ResultadoIlustracion> {
  ctx.logger.paso('ilustrador', `Imagen para «${titulo}»`);
  const dir = ctx.simulacion
    ? resolve(process.cwd(), 'datos/simulacion/imagenes')
    : resolve(process.cwd(), 'public/imagenes');
  mkdirSync(dir, { recursive: true });

  // 1) Si hay clave de un banco de fotos (y no es simulación), intentamos una foto con licencia.
  if (hayClaveFotos() && !ctx.simulacion) {
    const foto = await descargarFoto({
      busqueda: busquedaParaArticulo(categoria, titulo, await consultasLiterales(ficha, titulo, ctx)),
      destinoAbsSinExt: resolve(dir, slug),
      slug,
      altBase: `Imagen del artículo: ${titulo}`,
    });
    if (foto) {
      return { imagen: foto.rutaPublica, imagenAlt: foto.alt, imagenCredito: foto.credito };
    }
  }

  // 2) Portada propia de color (alternativa segura si no hay foto).
  const ruta = resolve(dir, `${slug}.svg`);
  const seccion = categoriaPorSlug(categoria)?.nombre ?? 'Actualidad';
  const colores = colorCategoria(categoria);

  let svg: string;
  let alt: string;
  if (ficha.datosNumericos.length > 0) {
    const fuente = ficha.fuentes[0]?.organismo ?? ficha.fuentes[0]?.titulo ?? 'fuente oficial';
    svg = graficoBarrasSVG(titulo, seccion, colores, ficha.datosNumericos, fuente);
    alt = `Gráfico de ${titulo.toLowerCase()} con datos de ${fuente}.`;
  } else {
    svg = portadaSVG(titulo, seccion, colores);
    alt = `Portada de Bolsillo Diario: ${titulo}.`;
  }

  writeFileSync(ruta, svg, 'utf8');
  return { imagen: `/imagenes/${slug}.svg`, imagenAlt: alt };
}
