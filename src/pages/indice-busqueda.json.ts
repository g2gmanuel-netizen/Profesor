import type { APIRoute } from 'astro';
import { todosLosArticulos, urlArticulo } from '../lib/articulos';
import { categoriaPorSlug } from '../lib/sitio';

export const GET: APIRoute = async () => {
  const arts = await todosLosArticulos();
  const indice = arts.map((a) => ({
    titulo: a.data.titulo,
    descripcion: a.data.descripcion,
    categoria: categoriaPorSlug(a.data.categoria)?.nombre ?? a.data.categoria,
    etiquetas: a.data.etiquetas,
    autor: a.data.autor,
    url: urlArticulo(a),
    fecha: a.data.fechaPublicacion.toISOString(),
  }));
  return new Response(JSON.stringify(indice), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
