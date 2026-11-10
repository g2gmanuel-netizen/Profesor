// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

/**
 * Marca como «nota» los párrafos que son solo un texto en cursiva (pies de foto sueltos,
 * avisos de «Análisis y opinión», notas bajo tablas) para darles un estilo propio.
 * Un párrafo con alguna palabra en cursiva dentro de texto normal NO se marca.
 */
function rehypeNotas() {
  const esEspacio = (n) => n.type === 'text' && !n.value.trim();
  const visitar = (nodo) => {
    if (nodo.type === 'element' && nodo.tagName === 'p') {
      const hijos = nodo.children.filter((h) => !esEspacio(h));
      if (hijos.length === 1 && hijos[0].type === 'element' && hijos[0].tagName === 'em') {
        nodo.properties = nodo.properties || {};
        const previas = nodo.properties.className || [];
        nodo.properties.className = [...(Array.isArray(previas) ? previas : [previas]), 'nota'];
      }
    }
    if (nodo.children) nodo.children.forEach(visitar);
  };
  return (arbol) => visitar(arbol);
}

// El dominio final se configura con la variable de entorno DOMINIO.
// Mientras sea "[PENDIENTE]" usamos un placeholder para que el build no falle.
const dominio = process.env.DOMINIO && process.env.DOMINIO !== '[PENDIENTE]'
  ? process.env.DOMINIO
  : 'tubolsillodiario.com';

export default defineConfig({
  site: `https://${dominio}`,
  trailingSlash: 'ignore',
  integrations: [mdx()],
  markdown: {
    rehypePlugins: [rehypeNotas],
  },
  build: {
    format: 'directory',
  },
  image: {
    // Permitimos solo imágenes propias en /public; no cargamos imágenes de terceros.
    remotePatterns: [],
  },
});
