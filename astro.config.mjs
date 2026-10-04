// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// El dominio final se configura con la variable de entorno DOMINIO.
// Mientras sea "[PENDIENTE]" usamos un placeholder para que el build no falle.
const dominio = process.env.DOMINIO && process.env.DOMINIO !== '[PENDIENTE]'
  ? process.env.DOMINIO
  : 'tubolsillodiario.com';

export default defineConfig({
  site: `https://${dominio}`,
  trailingSlash: 'ignore',
  integrations: [mdx()],
  build: {
    format: 'directory',
  },
  image: {
    // Permitimos solo imágenes propias en /public; no cargamos imágenes de terceros.
    remotePatterns: [],
  },
});
