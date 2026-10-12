/**
 * Difusión: a partir de los artículos ya publicados (en src/content/articulos),
 * genera un "kit de posts" listo para copiar y pegar en redes (X, Telegram/WhatsApp,
 * Instagram/TikTok con guion de vídeo) y, opcionalmente, publica en un canal de
 * Telegram propio (gratis) si están definidos TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID.
 *
 * - No gasta nada de IA: los textos se generan con plantillas a partir del titular,
 *   la entradilla y las claves del artículo.
 * - Lleva registro en datos/difundidos.json para no repetir artículos ya difundidos.
 * - El kit se escribe en datos/difusion-<fecha>.md y datos/difusion-ultima.md.
 *
 * Uso:
 *   npm run difusion            → solo genera el kit (no publica)
 *   npm run difusion -- --publicar  → además publica en Telegram si hay credenciales
 *
 * Nota: la publicación a Telegram solo funciona con salida a internet (GitHub Actions).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { SITIO, categoriaPorSlug } from '../src/lib/sitio';

const DIR_ART = resolve(process.cwd(), 'src/content/articulos');
const DIR_DATOS = resolve(process.cwd(), 'datos');
const RUTA_DIFUNDIDOS = resolve(DIR_DATOS, 'difundidos.json');
const MAX_POR_EJECUCION = 5;

interface Articulo {
  slug: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  categoria: string;
  fecha: string; // ISO corta
  etiquetas: string[];
  claves: string[];
  borrador: boolean;
}

interface Registro {
  difundidos: { slug: string; fecha: string }[];
}

function leerFrontmatter(texto: string): Record<string, unknown> {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  try {
    return (parse(m[1]!) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

function aFechaCorta(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v ?? '');
  // Admite "2026-10-10" o "dd/mm/aaaa".
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

function cargarArticulos(): Articulo[] {
  if (!existsSync(DIR_ART)) return [];
  const ficheros = readdirSync(DIR_ART).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
  const arts: Articulo[] = [];
  for (const f of ficheros) {
    const fm = leerFrontmatter(readFileSync(resolve(DIR_ART, f), 'utf8'));
    if (!fm.titulo) continue;
    arts.push({
      slug: f.replace(/\.(md|mdx)$/, ''),
      titulo: String(fm.titulo),
      subtitulo: String(fm.subtitulo ?? ''),
      descripcion: String(fm.descripcion ?? ''),
      categoria: String(fm.categoria ?? 'actualidad'),
      fecha: aFechaCorta(fm.fechaPublicacion),
      etiquetas: Array.isArray(fm.etiquetas) ? (fm.etiquetas as unknown[]).map(String) : [],
      claves: Array.isArray(fm.clavesRapidas) ? (fm.clavesRapidas as unknown[]).map(String) : [],
      borrador: fm.borrador === true,
    });
  }
  // Más nuevos primero.
  return arts.filter((a) => !a.borrador).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

function cargarRegistro(): Registro {
  if (!existsSync(RUTA_DIFUNDIDOS)) return { difundidos: [] };
  try {
    const r = JSON.parse(readFileSync(RUTA_DIFUNDIDOS, 'utf8')) as Registro;
    return { difundidos: Array.isArray(r.difundidos) ? r.difundidos : [] };
  } catch {
    return { difundidos: [] };
  }
}

function url(slug: string): string {
  return `${SITIO.url}/articulo/${slug}/`;
}

function hashtags(a: Articulo): string {
  const limpia = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');
  const normaliza = (s: string) => limpia(s).toLowerCase();
  // Evitamos duplicar España/BolsilloDiario, que añadimos fijos al final.
  const reservados = new Set(['espana', 'bolsillodiario']);
  const base = [a.categoria, ...a.etiquetas]
    .map(limpia)
    .filter((s) => s.length > 2 && !reservados.has(s.toLowerCase()))
    .map((s) => `#${s.charAt(0).toUpperCase()}${s.slice(1)}`);
  const vistos = new Set<string>();
  const unicos = base.filter((t) => {
    const k = normaliza(t);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  return [...unicos.slice(0, 3), '#España', '#BolsilloDiario'].join(' ');
}

function recortar(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

/** Post para X/Twitter (<280 caracteres, con gancho, enlace y hashtags). */
function postX(a: Articulo): string {
  const u = url(a.slug);
  const tags = hashtags(a);
  // Reservamos espacio para enlace (23) + hashtags + saltos.
  const espacioTexto = 280 - (tags.length + 1) - 24 - 4;
  const gancho = recortar(a.titulo, Math.max(40, espacioTexto));
  return `${gancho}\n\n👉 ${u}\n${tags}`;
}

/** Mensaje para Telegram / canal de WhatsApp (admite varias líneas y claves). */
function postChat(a: Articulo): string {
  const u = url(a.slug);
  const cat = categoriaPorSlug(a.categoria)?.nombre ?? 'Actualidad';
  const claves = a.claves.slice(0, 3).map((c) => `• ${c}`).join('\n');
  return [
    `📰 *${a.titulo}*`,
    '',
    recortar(a.subtitulo || a.descripcion, 220),
    claves ? `\n${claves}` : '',
    '',
    `🔗 Léelo aquí: ${u}`,
    '',
    `_${cat} · Bolsillo Diario_`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/** Guion de vídeo corto (30 s) + pie para Instagram/TikTok/Shorts. */
function guionVideo(a: Articulo): string {
  const claves = a.claves.length ? a.claves.slice(0, 3) : [a.subtitulo || a.descripcion];
  const puntos = claves.map((c, i) => `  ${i + 1}. ${c}`).join('\n');
  return [
    `🎬 GUION VÍDEO CORTO (~30 s) — ${a.titulo}`,
    `  • Gancho (0-3 s): "¿${recortar(a.titulo.replace(/\.$/, ''), 70)}?"`,
    `  • Desarrollo (3-25 s):`,
    puntos,
    `  • Cierre (25-30 s): "Te lo explicamos entero en Bolsillo Diario. Enlace en la bio."`,
    '',
    `📸 PIE PARA INSTAGRAM / TIKTOK:`,
    `  ${recortar(a.subtitulo || a.descripcion, 200)}`,
    `  🔗 Enlace en la bio · ${hashtags(a)}`,
  ].join('\n');
}

function construirKit(nuevos: Articulo[], hoy: string): string {
  const bloques = nuevos.map((a, n) => {
    return [
      `## ${n + 1}. ${a.titulo}`,
      `**Enlace:** ${url(a.slug)}`,
      '',
      '### X / Twitter',
      '```',
      postX(a),
      '```',
      '',
      '### Telegram / Canal de WhatsApp',
      '```',
      postChat(a),
      '```',
      '',
      '### Instagram / TikTok / YouTube Shorts',
      '```',
      guionVideo(a),
      '```',
    ].join('\n');
  });
  return [
    `# Kit de difusión — ${hoy}`,
    '',
    'Copia y pega estos textos en tus redes. Publica cada artículo el mismo día ' +
      'para aprovechar el tirón del tema. Si has activado el bot de Telegram, esos ' +
      'posts ya se han publicado solos en tu canal.',
    '',
    ...bloques,
  ].join('\n\n');
}

async function publicarTelegram(a: Articulo, token: string, chatId: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: postChat(a),
        
        disable_web_page_preview: false,
      }),
    });
    if (!r.ok) {
      // eslint-disable-next-line no-console
      console.log(`  · Telegram respondió ${r.status} para «${a.titulo}»: ${await r.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(`  · Error publicando en Telegram: ${String(e)}`);
    return false;
  }
}

async function main(): Promise<void> {
  const publicar = process.argv.includes('--publicar');
  const test = process.argv.includes('--test');
  const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const chatId = process.env.TELEGRAM_CHAT_ID ?? '';

  const articulos = cargarArticulos();
  if (articulos.length === 0) {
    // eslint-disable-next-line no-console
    console.log('No hay artículos. Nada que difundir.');
    return;
  }

  // Modo prueba: publica el artículo más reciente en Telegram para comprobar que
  // la conexión funciona, SIN tocar el registro ni generar kit.
  if (test) {
    if (!token || !chatId) {
      // eslint-disable-next-line no-console
      console.log('PRUEBA: faltan TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID. Añádelos como secretos y reintenta.');
      process.exit(1);
    }
    const a = articulos[0]!;
    const ok = await publicarTelegram(a, token, chatId);
    // eslint-disable-next-line no-console
    console.log(ok ? `✓ PRUEBA enviada a Telegram: ${a.titulo}` : '✗ PRUEBA fallida: revisa el token y que el bot sea administrador del canal.');
    process.exit(ok ? 0 : 1);
  }

  const primeraVez = !existsSync(RUTA_DIFUNDIDOS);
  const registro = cargarRegistro();
  const vistos = new Set(registro.difundidos.map((d) => d.slug));
  const nuevos = articulos.filter((a) => !vistos.has(a.slug));

  if (nuevos.length === 0) {
    // eslint-disable-next-line no-console
    console.log('No hay artículos nuevos que difundir.');
    return;
  }

  const aProcesar = nuevos.slice(0, MAX_POR_EJECUCION);
  const hoy = new Date().toISOString().slice(0, 10);

  // Generar el kit copia-pega (siempre).
  mkdirSync(DIR_DATOS, { recursive: true });
  const kit = construirKit(aProcesar, hoy);
  writeFileSync(resolve(DIR_DATOS, `difusion-${hoy}.md`), kit, 'utf8');
  writeFileSync(resolve(DIR_DATOS, 'difusion-ultima.md'), kit, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Kit de difusión generado para ${aProcesar.length} artículo(s): datos/difusion-${hoy}.md`);

  // Publicar en Telegram (si procede). En la PRIMERA ejecución no publicamos:
  // solo registramos lo existente para no inundar el canal con el histórico.
  if (publicar && token && chatId && !primeraVez) {
    for (const a of aProcesar) {
      const ok = await publicarTelegram(a, token, chatId);
      // eslint-disable-next-line no-console
      console.log(ok ? `  ✓ Telegram: ${a.titulo}` : `  · No publicado: ${a.titulo}`);
    }
  } else if (publicar && (!token || !chatId)) {
    // eslint-disable-next-line no-console
    console.log('Telegram no configurado (faltan TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID): solo se generó el kit.');
  } else if (primeraVez) {
    // eslint-disable-next-line no-console
    console.log('Primera ejecución: registro el histórico sin publicar para no inundar el canal.');
  }

  // Marcar como difundidos. En la primera vez, marcamos TODO el histórico;
  // después, solo los procesados en esta ejecución.
  const marcar = primeraVez ? nuevos : aProcesar;
  const ahora = new Date().toISOString();
  registro.difundidos.push(...marcar.map((a) => ({ slug: a.slug, fecha: ahora })));
  writeFileSync(RUTA_DIFUNDIDOS, JSON.stringify(registro, null, 2) + '\n', 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Registrados ${marcar.length} artículo(s) en datos/difundidos.json.`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Error en difusión:', e);
  process.exit(1);
});
