/**
 * Carruseles para Instagram y TikTok (modo foto), sin cara ni voz: a partir de los
 * artículos publicados genera 1080×1350 px por diapositiva (portada con la foto del
 * artículo, una diapositiva por clave rápida y cierre con llamada a la acción) más
 * el texto de la publicación con hashtags.
 *
 * Para LinkedIn genera además el mismo carrusel en un PDF (linkedin.pdf), que es el
 * formato «documento» que más alcance tiene allí, y un texto propio (linkedin.txt).
 *
 * Se escriben en public/redes/<slug>/ y la página /redes los lista para descargarlos
 * desde el móvil. Solo se conservan los MAX_CARRUSELES más recientes.
 *
 * Uso: npx tsx scripts/carruseles.ts
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { parse } from 'yaml';
import { SITIO, categoriaPorSlug, colorCategoria } from '../src/lib/sitio';

const DIR_ART = resolve(process.cwd(), 'src/content/articulos');
const DIR_PUBLIC = resolve(process.cwd(), 'public');
const DIR_REDES = resolve(DIR_PUBLIC, 'redes');
const MAX_CARRUSELES = 10;
const MAX_CLAVES = 4;
const W = 1080;
const H = 1350;

const VERDE = '#0a5234';
const PAPEL = '#faf7f1';
const TINTA = '#16130d';
const SANS = "'DejaVu Sans', Helvetica, Arial, sans-serif";
const SERIF = "'DejaVu Serif', Georgia, serif";

interface Articulo {
  slug: string;
  titulo: string;
  subtitulo: string;
  categoria: string;
  fecha: string;
  imagen: string;
  etiquetas: string[];
  claves: string[];
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Quita el marcado Markdown que pueda traer una clave (negritas, enlaces). */
function textoPlano(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function lineas(texto: string, maxChars: number): string[] {
  const res: string[] = [];
  let actual = '';
  for (const p of texto.split(/\s+/)) {
    if (actual && (actual + ' ' + p).length > maxChars) {
      res.push(actual);
      actual = p;
    } else {
      actual = actual ? `${actual} ${p}` : p;
    }
  }
  if (actual) res.push(actual);
  return res;
}

/** Elige el mayor tamaño de letra con el que el texto cabe en el recuadro. */
function ajustar(texto: string, ancho: number, alto: number, tamanos: number[], factor: number) {
  for (const fs of tamanos) {
    const ls = lineas(texto, Math.floor(ancho / (fs * factor)));
    if (ls.length * fs * 1.25 <= alto) return { fs, ls };
  }
  const fs = tamanos[tamanos.length - 1]!;
  const max = Math.floor(alto / (fs * 1.25));
  const ls = lineas(texto, Math.floor(ancho / (fs * factor))).slice(0, max);
  ls[ls.length - 1] = ls[ls.length - 1]!.replace(/[.,;:]?$/, '…');
  return { fs, ls };
}

function tspans(ls: string[], x: number, y0: number, fs: number): string {
  return ls.map((l, i) => `<tspan x="${x}" y="${Math.round(y0 + i * fs * 1.25)}">${esc(l)}</tspan>`).join('');
}

function marca(color: string, y = 92): string {
  return `<text x="80" y="${y}" font-family="${SANS}" font-size="30" font-weight="700" letter-spacing="4" fill="${color}">BOLSILLO DIARIO</text>`;
}

function portadaSVG(a: Articulo, conFoto: boolean, total: number): string {
  const [c1] = colorCategoria(a.categoria);
  const seccion = (categoriaPorSlug(a.categoria)?.nombre ?? 'Actualidad').toUpperCase();
  const { fs, ls } = ajustar(a.titulo, W - 160, 560, [84, 76, 68, 60, 54], 0.6);
  const yTexto = H - 190 - ls.length * fs * 1.25 + fs;
  const fondo = conFoto
    ? `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="#000" stop-opacity="0.55"/>
         <stop offset="0.35" stop-color="#000" stop-opacity="0.15"/>
         <stop offset="0.55" stop-color="#000" stop-opacity="0.55"/>
         <stop offset="1" stop-color="#000" stop-opacity="0.92"/>
       </linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>`
    : `<rect width="${W}" height="${H}" fill="${VERDE}"/>`;
  const chipAncho = seccion.length * 19 + 48;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  ${fondo}
  ${marca('#ffffff')}
  <rect x="80" y="${Math.round(yTexto - fs - 70)}" width="${chipAncho}" height="52" rx="26" fill="${c1}"/>
  <text x="104" y="${Math.round(yTexto - fs - 34)}" font-family="${SANS}" font-size="26" font-weight="700" letter-spacing="2" fill="#fff">${esc(seccion)}</text>
  <text font-family="${SANS}" font-size="${fs}" font-weight="700" fill="#fff">${tspans(ls, 80, yTexto, fs)}</text>
  <text x="80" y="${H - 90}" font-family="${SANS}" font-size="32" font-weight="700" fill="#fff" opacity="0.9">Desliza para saber más  →</text>
  <text x="${W - 80}" y="${H - 90}" font-family="${SANS}" font-size="28" fill="#fff" opacity="0.7" text-anchor="end">1/${total}</text>
</svg>`;
}

function claveSVG(texto: string, n: number, pagina: number, total: number): string {
  const { fs, ls } = ajustar(texto, W - 160, 680, [64, 58, 52, 46, 42], 0.58);
  const y0 = 460 + fs;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${PAPEL}"/>
  <rect width="${W}" height="140" fill="${VERDE}"/>
  ${marca('#ffffff')}
  <text x="${W - 80}" y="92" font-family="${SANS}" font-size="28" fill="#fff" opacity="0.8" text-anchor="end">${pagina}/${total}</text>
  <circle cx="140" cy="290" r="60" fill="${VERDE}"/>
  <text x="140" y="314" font-family="${SANS}" font-size="64" font-weight="700" fill="#fff" text-anchor="middle">${n}</text>
  <rect x="80" y="390" width="120" height="8" fill="#9a2a1f"/>
  <text font-family="${SERIF}" font-size="${fs}" font-weight="700" fill="${TINTA}">${tspans(ls, 80, y0, fs)}</text>
  <line x1="80" y1="${H - 150}" x2="${W - 80}" y2="${H - 150}" stroke="#cfc8ba" stroke-width="2"/>
  <text x="80" y="${H - 85}" font-family="${SANS}" font-size="30" fill="#6a6256">tubolsillodiario.com</text>
  <text x="${W - 80}" y="${H - 85}" font-family="${SANS}" font-size="30" font-weight="700" fill="${VERDE}" text-anchor="end">→</text>
</svg>`;
}

function cierreSVG(total: number): string {
  const centro = W / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${VERDE}"/>
  ${marca('#ffffff')}
  <text x="${W - 80}" y="92" font-family="${SANS}" font-size="28" fill="#fff" opacity="0.8" text-anchor="end">${total}/${total}</text>
  <text x="${centro}" y="470" font-family="${SERIF}" font-size="80" font-weight="700" fill="#fff" text-anchor="middle">¿Te ha servido?</text>
  <text font-family="${SANS}" font-size="44" fill="#fff" text-anchor="middle">
    <tspan x="${centro}" y="600">Guárdalo para tenerlo a mano</tspan>
    <tspan x="${centro}" y="665">y compártelo con quien lo necesite.</tspan>
  </text>
  <rect x="140" y="790" width="${W - 280}" height="150" rx="75" fill="#fff"/>
  <text x="${centro}" y="850" font-family="${SANS}" font-size="30" fill="${VERDE}" text-anchor="middle">La noticia completa en</text>
  <text x="${centro}" y="905" font-family="${SANS}" font-size="44" font-weight="700" fill="${VERDE}" text-anchor="middle">tubolsillodiario.com</text>
  <text x="${centro}" y="1090" font-family="${SANS}" font-size="34" fill="#fff" opacity="0.85" text-anchor="middle">Síguenos: @tubolsillodiario</text>
  <text x="${centro}" y="${H - 90}" font-family="${SANS}" font-size="26" fill="#fff" opacity="0.6" text-anchor="middle">Noticias de dinero que te afectan, explicadas claro</text>
</svg>`;
}

function hashtags(a: Articulo): string {
  const limpia = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '');
  const fijos = ['#Dinero', '#Ahorro', '#FinanzasPersonales', '#España', '#BolsilloDiario'];
  const vistos = new Set(fijos.map((t) => limpia(t).toLowerCase()));
  const propios: string[] = [];
  for (const s of [a.categoria, ...a.etiquetas]) {
    const t = limpia(s);
    if (t.length < 4 || vistos.has(t.toLowerCase())) continue;
    vistos.add(t.toLowerCase());
    propios.push(`#${t.charAt(0).toUpperCase()}${t.slice(1)}`);
  }
  return [...propios.slice(0, 3), ...fijos].join(' ');
}

/** Enlace al artículo con etiquetas UTM para saber en Analytics qué red trae visitas. */
export function enlaceMedido(slug: string, red: string): string {
  return `${SITIO.url}/articulo/${slug}/?utm_source=${red}&utm_medium=social&utm_campaign=carrusel`;
}

/** Texto para LinkedIn: gancho, claves y pregunta; el enlace va en el primer comentario. */
function textoLinkedIn(a: Articulo, claves: string[]): string {
  const etiquetas = hashtags(a).split(' ').slice(0, 3).join(' ');
  return [
    a.titulo,
    '',
    a.subtitulo,
    '',
    ...claves.map((c, i) => `${i + 1}. ${c}`),
    '',
    'Te lo dejo en el carrusel para que lo guardes 👇',
    '',
    '¿Te afecta de alguna forma? Te leo en comentarios.',
    '',
    etiquetas,
  ].join('\n');
}

/**
 * PDF mínimo con una página por imagen JPEG (las imágenes van tal cual, con DCTDecode),
 * suficiente para subirlo a LinkedIn como documento sin depender de otra librería.
 */
export function pdfDeJpegs(jpegs: Buffer[], ancho: number, alto: number): Buffer {
  const partes: Buffer[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const escribir = (b: Buffer | string) => {
    const buf = typeof b === 'string' ? Buffer.from(b, 'latin1') : b;
    partes.push(buf);
    pos += buf.length;
  };
  const objeto = (n: number, cuerpo: (Buffer | string)[]) => {
    offsets[n] = pos;
    escribir(`${n} 0 obj\n`);
    for (const c of cuerpo) escribir(c);
    escribir('\nendobj\n');
  };
  const n = jpegs.length;
  // 1: catálogo, 2: árbol de páginas, y por cada página: página, contenido e imagen.
  const pagina = (i: number) => 3 + i * 3;
  escribir('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  objeto(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
  objeto(2, [`<< /Type /Pages /Count ${n} /Kids [${jpegs.map((_, i) => `${pagina(i)} 0 R`).join(' ')}] >>`]);
  jpegs.forEach((jpg, i) => {
    const p = pagina(i);
    const dibujo = `q ${ancho} 0 0 ${alto} 0 0 cm /Im0 Do Q`;
    objeto(p, [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ancho} ${alto}] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`,
    ]);
    objeto(p + 1, [`<< /Length ${dibujo.length} >>\nstream\n${dibujo}\nendstream`]);
    objeto(p + 2, [
      `<< /Type /XObject /Subtype /Image /Width ${ancho} /Height ${alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`,
      jpg,
      '\nendstream',
    ]);
  });
  const total = 3 + n * 3;
  const xref = pos;
  escribir(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) escribir(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  escribir(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return Buffer.concat(partes);
}

function textoPublicacion(a: Articulo, claves: string[]): string {
  return [
    a.titulo,
    '',
    a.subtitulo,
    '',
    ...claves.map((c) => `✅ ${c}`),
    '',
    '📌 Guárdalo para tenerlo a mano y compártelo con quien le pueda servir.',
    '🔗 Noticia completa en el enlace de la bio: tubolsillodiario.com',
    '',
    hashtags(a),
  ].join('\n');
}

function aFecha(v: unknown): string {
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').slice(0, 10);
}

function cargarArticulos(): Articulo[] {
  const arts: Articulo[] = [];
  for (const f of readdirSync(DIR_ART)) {
    if (!/\.mdx?$/.test(f)) continue;
    const m = readFileSync(resolve(DIR_ART, f), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) continue;
    const fm = (parse(m[1]!) ?? {}) as Record<string, unknown>;
    if (!fm.titulo || fm.borrador === true) continue;
    arts.push({
      slug: f.replace(/\.mdx?$/, ''),
      titulo: textoPlano(String(fm.titulo)),
      subtitulo: textoPlano(String(fm.subtitulo ?? fm.descripcion ?? '')),
      categoria: String(fm.categoria ?? 'actualidad'),
      fecha: aFecha(fm.fechaPublicacion),
      imagen: String(fm.imagen ?? ''),
      etiquetas: Array.isArray(fm.etiquetas) ? fm.etiquetas.map(String) : [],
      claves: Array.isArray(fm.clavesRapidas) ? fm.clavesRapidas.map((c) => textoPlano(String(c))) : [],
    });
  }
  return arts.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.slug.localeCompare(b.slug));
}

async function fotoDeFondo(imagen: string): Promise<Buffer | null> {
  if (!imagen || !/\.(jpe?g|png|webp)$/i.test(imagen)) return null;
  const ruta = resolve(DIR_PUBLIC, imagen.replace(/^\//, ''));
  if (!existsSync(ruta)) return null;
  return sharp(ruta).resize(W, H, { fit: 'cover', position: 'attention' }).toBuffer();
}

async function generar(a: Articulo): Promise<number> {
  const dir = resolve(DIR_REDES, a.slug);
  mkdirSync(dir, { recursive: true });
  const claves = a.claves.slice(0, MAX_CLAVES);
  const total = claves.length + 2;
  const foto = await fotoDeFondo(a.imagen);

  const portada = Buffer.from(portadaSVG(a, foto !== null, total));
  const base = foto ? sharp(foto).composite([{ input: portada }]) : sharp(portada);
  await base.jpeg({ quality: 90 }).toFile(resolve(dir, '1.jpg'));

  for (const [i, c] of claves.entries()) {
    await sharp(Buffer.from(claveSVG(c, i + 1, i + 2, total))).jpeg({ quality: 90 }).toFile(resolve(dir, `${i + 2}.jpg`));
  }
  await sharp(Buffer.from(cierreSVG(total))).jpeg({ quality: 90 }).toFile(resolve(dir, `${total}.jpg`));

  writeFileSync(resolve(dir, 'texto.txt'), textoPublicacion(a, claves) + '\n', 'utf8');
  const jpegs = Array.from({ length: total }, (_, i) => readFileSync(resolve(dir, `${i + 1}.jpg`)));
  writeFileSync(resolve(dir, 'linkedin.pdf'), pdfDeJpegs(jpegs, W, H));
  writeFileSync(resolve(dir, 'linkedin.txt'), textoLinkedIn(a, claves) + '\n', 'utf8');
  writeFileSync(
    resolve(dir, 'info.json'),
    JSON.stringify(
      { slug: a.slug, titulo: a.titulo, fecha: a.fecha, imagenes: total, enlaceLinkedIn: enlaceMedido(a.slug, 'linkedin') },
      null,
      2,
    ) + '\n',
    'utf8',
  );
  return total;
}

async function main(): Promise<void> {
  const forzar = process.argv.includes('--forzar');
  const recientes = cargarArticulos()
    .filter((a) => a.claves.length > 0)
    .slice(0, MAX_CARRUSELES);
  mkdirSync(DIR_REDES, { recursive: true });

  const vigentes = new Set(recientes.map((a) => a.slug));
  for (const d of readdirSync(DIR_REDES)) {
    if (!vigentes.has(d)) rmSync(resolve(DIR_REDES, d), { recursive: true, force: true });
  }

  for (const a of recientes) {
    const hecho = existsSync(resolve(DIR_REDES, a.slug, 'linkedin.pdf'));
    if (!forzar && hecho && JSON.parse(readFileSync(resolve(DIR_REDES, a.slug, 'info.json'), 'utf8')).titulo === a.titulo) continue;
    const n = await generar(a);
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${a.slug} (${n} imágenes)`);
  }
  // eslint-disable-next-line no-console
  console.log(`Carruseles listos en ${SITIO.url}/redes/`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Error generando carruseles:', e);
  process.exit(1);
});
