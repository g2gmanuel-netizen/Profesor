/**
 * Publicación automática de las noticias nuevas en redes sociales:
 *  - Facebook: publicación en la página con el enlace (Facebook genera la vista previa).
 *  - Instagram: el carrusel de public/redes/<slug>/ con su texto (cuenta profesional
 *    vinculada a la página de Facebook).
 *  - Bluesky: publicación con tarjeta de enlace (título, resumen y foto).
 *
 * Cada red solo se usa si tiene sus claves en los secretos del repositorio; si faltan,
 * se salta sin error. Lleva registro en datos/redes-publicados.json para no repetir.
 *
 * Variables: FB_PAGE_ID, FB_PAGE_TOKEN, IG_USER_ID, BSKY_HANDLE, BSKY_APP_PASSWORD.
 * Uso: npx tsx scripts/redes-auto.ts [--simular]
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { parse } from 'yaml';
import { SITIO } from '../src/lib/sitio';

const DIR_ART = resolve(process.cwd(), 'src/content/articulos');
const DIR_PUBLIC = resolve(process.cwd(), 'public');
const REGISTRO = resolve(process.cwd(), 'datos/redes-publicados.json');
const GRAPH = 'https://graph.facebook.com/v21.0';
const BSKY = 'https://bsky.social/xrpc';
/** Máximo de publicaciones por red y ejecución, para no saturar a los seguidores. */
const MAX_POR_RED = 3;
/** Solo se publican noticias de los últimos días (no el archivo antiguo). */
const DIAS_RECIENTES = 3;

export type Red = 'facebook' | 'instagram' | 'bluesky';
type Registro = Record<Red, string[]>;

export interface Noticia {
  slug: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  fecha: string;
  imagen: string;
  claves: string[];
}

const plano = (s: string) =>
  s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function enlace(slug: string, red: Red): string {
  return `${SITIO.url}/articulo/${slug}/?utm_source=${red}&utm_medium=social&utm_campaign=auto`;
}

/** Recorta a un máximo de caracteres visibles sin partir palabras. */
export function recortar(texto: string, max: number): string {
  const letras = Array.from(texto);
  if (letras.length <= max) return texto;
  const corto = letras.slice(0, max - 1).join('');
  return corto.slice(0, Math.max(corto.lastIndexOf(' '), max * 0.6)).trimEnd() + '…';
}

/** Texto de Facebook: titular, entradilla, claves y enlace. */
export function textoFacebook(n: Noticia): string {
  return [
    n.titulo,
    '',
    n.subtitulo,
    '',
    ...n.claves.slice(0, 3).map((c) => `✅ ${c}`),
    '',
    `👉 ${enlace(n.slug, 'facebook')}`,
  ].join('\n');
}

/** Bluesky admite 300 caracteres; el enlace va en la tarjeta, no en el texto. */
export function textoBluesky(n: Noticia): string {
  const base = `${n.titulo}\n\n${n.subtitulo}`;
  return recortar(Array.from(base).length <= 300 ? base : n.titulo, 300);
}

function aFecha(v: unknown): string {
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').slice(0, 10);
}

export function cargarNoticias(): Noticia[] {
  const out: Noticia[] = [];
  for (const f of readdirSync(DIR_ART)) {
    if (!/\.mdx?$/.test(f)) continue;
    const m = readFileSync(resolve(DIR_ART, f), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) continue;
    const fm = (parse(m[1]!) ?? {}) as Record<string, unknown>;
    if (!fm.titulo || fm.borrador === true) continue;
    out.push({
      slug: f.replace(/\.mdx?$/, ''),
      titulo: plano(String(fm.titulo)),
      subtitulo: plano(String(fm.subtitulo ?? '')),
      descripcion: plano(String(fm.descripcion ?? fm.subtitulo ?? '')),
      fecha: aFecha(fm.fechaPublicacion),
      imagen: String(fm.imagen ?? ''),
      claves: Array.isArray(fm.clavesRapidas) ? fm.clavesRapidas.map((c) => plano(String(c))) : [],
    });
  }
  return out.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.slug.localeCompare(b.slug));
}

function cargarRegistro(): Registro | null {
  if (!existsSync(REGISTRO)) return null;
  try {
    const r = JSON.parse(readFileSync(REGISTRO, 'utf8')) as Partial<Registro>;
    return { facebook: r.facebook ?? [], instagram: r.instagram ?? [], bluesky: r.bluesky ?? [] };
  } catch {
    return null;
  }
}

/** Noticias pendientes de una red: recientes, no publicadas, de la más antigua a la más nueva. */
export function pendientes(noticias: Noticia[], hechas: string[], hoy = new Date()): Noticia[] {
  const limite = new Date(hoy.getTime() - DIAS_RECIENTES * 86400000).toISOString().slice(0, 10);
  const ya = new Set(hechas);
  return noticias
    .filter((n) => n.fecha >= limite && !ya.has(n.slug))
    .slice(0, MAX_POR_RED)
    .reverse();
}

async function pedir(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  const r = await fetch(url, init);
  const cuerpo = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok || cuerpo.error) {
    const e = cuerpo.error as { message?: string } | string | undefined;
    throw new Error(`${r.status} ${typeof e === 'string' ? e : (e?.message ?? JSON.stringify(cuerpo).slice(0, 300))}`);
  }
  return cuerpo;
}

const form = (datos: Record<string, string>) => ({ method: 'POST', body: new URLSearchParams(datos) });

// ——— Facebook ———
async function publicarFacebook(n: Noticia, pagina: string, token: string): Promise<void> {
  await pedir(`${GRAPH}/${pagina}/feed`, form({ message: textoFacebook(n), link: enlace(n.slug, 'facebook'), access_token: token }));
}

// ——— Instagram (carrusel) ———
function imagenesCarrusel(slug: string): string[] {
  const info = resolve(DIR_PUBLIC, 'redes', slug, 'info.json');
  if (!existsSync(info)) return [];
  const { imagenes } = JSON.parse(readFileSync(info, 'utf8')) as { imagenes: number };
  return Array.from({ length: Math.min(imagenes, 10) }, (_, i) => `${SITIO.url}/redes/${slug}/${i + 1}.jpg`);
}

async function esperarContenedor(id: string, token: string): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const r = await pedir(`${GRAPH}/${id}?fields=status_code&access_token=${encodeURIComponent(token)}`, { method: 'GET' });
    if (r.status_code === 'FINISHED') return;
    if (r.status_code === 'ERROR' || r.status_code === 'EXPIRED') throw new Error(`contenedor ${id}: ${String(r.status_code)}`);
    await new Promise((ok) => setTimeout(ok, 3000));
  }
  throw new Error(`contenedor ${id}: tiempo agotado`);
}

async function publicarInstagram(n: Noticia, usuario: string, token: string): Promise<boolean> {
  const imagenes = imagenesCarrusel(n.slug);
  const textoRuta = resolve(DIR_PUBLIC, 'redes', n.slug, 'texto.txt');
  if (imagenes.length < 2 || !existsSync(textoRuta)) return false; // aún no tiene carrusel
  const caption = recortar(readFileSync(textoRuta, 'utf8').trim(), 2200);
  const hijos: string[] = [];
  for (const url of imagenes) {
    const r = await pedir(`${GRAPH}/${usuario}/media`, form({ image_url: url, is_carousel_item: 'true', access_token: token }));
    hijos.push(String(r.id));
  }
  for (const h of hijos) await esperarContenedor(h, token);
  const carrusel = await pedir(
    `${GRAPH}/${usuario}/media`,
    form({ media_type: 'CAROUSEL', children: hijos.join(','), caption, access_token: token }),
  );
  await esperarContenedor(String(carrusel.id), token);
  await pedir(`${GRAPH}/${usuario}/media_publish`, form({ creation_id: String(carrusel.id), access_token: token }));
  return true;
}

// ——— Bluesky ———
interface SesionBsky {
  did: string;
  accessJwt: string;
}

async function sesionBluesky(usuario: string, clave: string): Promise<SesionBsky> {
  const r = await pedir(`${BSKY}/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: usuario, password: clave }),
  });
  return { did: String(r.did), accessJwt: String(r.accessJwt) };
}

async function miniatura(imagen: string, s: SesionBsky): Promise<unknown | undefined> {
  const ruta = resolve(DIR_PUBLIC, imagen.replace(/^\//, ''));
  if (!imagen || !/\.(jpe?g|png|webp)$/i.test(imagen) || !existsSync(ruta)) return undefined;
  // Bluesky limita las miniaturas a ~1 MB.
  const jpg = await sharp(ruta).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 78 }).toBuffer();
  const r = await pedir(`${BSKY}/com.atproto.repo.uploadBlob`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg', Authorization: `Bearer ${s.accessJwt}` },
    body: jpg,
  });
  return r.blob;
}

async function publicarBluesky(n: Noticia, s: SesionBsky): Promise<void> {
  const thumb = await miniatura(n.imagen, s);
  const registro = {
    $type: 'app.bsky.feed.post',
    text: textoBluesky(n),
    createdAt: new Date().toISOString(),
    langs: ['es'],
    embed: {
      $type: 'app.bsky.embed.external',
      external: {
        uri: enlace(n.slug, 'bluesky'),
        title: recortar(n.titulo, 300),
        description: recortar(n.descripcion, 300),
        ...(thumb ? { thumb } : {}),
      },
    },
  };
  await pedir(`${BSKY}/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.accessJwt}` },
    body: JSON.stringify({ repo: s.did, collection: 'app.bsky.feed.post', record: registro }),
  });
}

async function main(): Promise<void> {
  const simular = process.argv.includes('--simular');
  const env = process.env;
  const noticias = cargarNoticias();
  const previo = cargarRegistro();
  // Primera ejecución: se marca el archivo como hecho y solo sale la noticia más reciente.
  const registro: Registro = previo ?? {
    facebook: noticias.slice(1).map((n) => n.slug),
    instagram: noticias.slice(1).map((n) => n.slug),
    bluesky: noticias.slice(1).map((n) => n.slug),
  };

  const redes: { red: Red; activa: boolean; publicar: (n: Noticia) => Promise<boolean> }[] = [];
  redes.push({
    red: 'facebook',
    activa: Boolean(env.FB_PAGE_ID && env.FB_PAGE_TOKEN),
    publicar: async (n) => (await publicarFacebook(n, env.FB_PAGE_ID!, env.FB_PAGE_TOKEN!), true),
  });
  redes.push({
    red: 'instagram',
    activa: Boolean(env.IG_USER_ID && env.FB_PAGE_TOKEN),
    publicar: (n) => publicarInstagram(n, env.IG_USER_ID!, env.FB_PAGE_TOKEN!),
  });
  let sesion: SesionBsky | null = null;
  redes.push({
    red: 'bluesky',
    activa: Boolean(env.BSKY_HANDLE && env.BSKY_APP_PASSWORD),
    publicar: async (n) => {
      sesion ??= await sesionBluesky(env.BSKY_HANDLE!, env.BSKY_APP_PASSWORD!);
      await publicarBluesky(n, sesion);
      return true;
    },
  });

  let fallos = 0;
  for (const { red, activa, publicar } of redes) {
    const cola = pendientes(noticias, registro[red]);
    if (!activa) {
      console.log(`· ${red}: sin claves configuradas, se omite.`);
      continue;
    }
    if (cola.length === 0) console.log(`· ${red}: nada nuevo que publicar.`);
    for (const n of cola) {
      if (simular) {
        console.log(`· ${red} (simulación): ${n.titulo}`);
        continue;
      }
      try {
        if (await publicar(n)) {
          registro[red].push(n.slug);
          console.log(`✓ ${red}: ${n.titulo}`);
        } else console.log(`· ${red}: «${n.titulo}» aún no tiene carrusel; se reintentará.`);
      } catch (e) {
        fallos++;
        console.error(`✗ ${red}: ${n.titulo} → ${(e as Error).message}`);
      }
    }
  }
  if (!simular) writeFileSync(REGISTRO, JSON.stringify(registro, null, 2) + '\n', 'utf8');
  if (fallos) console.error(`Hubo ${fallos} error(es) publicando; el resto se ha publicado y se reintentarán en la próxima ejecución.`);
}

if (process.argv[1]?.endsWith('redes-auto.ts')) {
  main().catch((e) => {
    console.error('Error en la publicación automática:', e);
    process.exit(1);
  });
}
