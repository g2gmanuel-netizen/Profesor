// @ts-check
import { defineConfig } from 'astro/config';

// Panel privado. Nunca se publica en abierto (ver Cloudflare Access en la guía).
export default defineConfig({
  output: 'static',
  server: { port: 4330 },
  devToolbar: { enabled: false },
});
