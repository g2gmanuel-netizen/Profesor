import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITIO } from '../lib/sitio';
import { todosLosArticulos, urlArticulo } from '../lib/articulos';

export async function GET(context: APIContext) {
  const arts = await todosLosArticulos();
  return rss({
    title: SITIO.nombre,
    description: SITIO.descripcion,
    site: context.site ?? SITIO.url,
    items: arts.map((a) => ({
      title: a.data.titulo,
      description: a.data.descripcion,
      pubDate: a.data.fechaPublicacion,
      link: urlArticulo(a),
      categories: [a.data.categoria, ...a.data.etiquetas],
      author: a.data.autor,
    })),
    customData: `<language>es-ES</language>`,
  });
}
