import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ContextoEjecucion } from '../lib/contexto';
import type { FichaHechos } from '../lib/esquemas';
import { portadaSVG, graficoBarrasSVG } from '../lib/portada';
import { descargarFotoPexels, queryParaArticulo } from '../lib/fotos';
import { categoriaPorSlug, colorCategoria } from '../../src/lib/sitio';

export interface ResultadoIlustracion {
  imagen: string; // ruta pública, p.ej. /imagenes/slug.svg o .jpg
  imagenAlt: string;
  imagenCredito?: string;
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

  // 1) Si hay clave de Pexels (y no es simulación), intentamos una foto real con licencia.
  const apiKey = process.env.PEXELS_API_KEY ?? '';
  if (apiKey && !ctx.simulacion) {
    const foto = await descargarFotoPexels({
      query: queryParaArticulo(categoria, []),
      apiKey,
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
