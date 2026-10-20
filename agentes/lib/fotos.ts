import { writeFileSync, readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, basename } from 'node:path';

/**
 * Búsqueda y descarga de fotos con licencia de uso comercial. Admite dos bancos
 * de fotos gratuitos; usa el que tenga clave en el entorno (Pixabay primero):
 *   - PIXABAY_API_KEY  (https://pixabay.com/api/docs/) — sin atribución obligatoria
 *   - PEXELS_API_KEY   (https://www.pexels.com/api/)   — sin atribución obligatoria
 * Si no hay clave o algo falla, devuelve null y el sistema usa la portada propia
 * de color. Nunca usa imágenes con derechos de autor.
 *
 * Cómo se elige la foto: NO con palabras sueltas del titular (en un banco de
 * fotos "banco" es un banco de parque y "luz" un atardecer), sino detectando el
 * CONCEPTO de la noticia (Banco de España, Congreso, pensiones, alquiler, luz…)
 * y usando búsquedas pensadas para él, en inglés, que es como están etiquetadas
 * las fotos. Además se descartan fotos de otros países (dólares, rupias, el
 * Capitolio de EE. UU…) y nunca se repite una foto ya usada en la web.
 */

export interface FotoDescargada {
  rutaPublica: string; // p.ej. /imagenes/slug.jpg
  credito: string; // "Foto: Autor (Pixabay)"
  alt: string;
}

export interface Busqueda {
  /** Búsquedas del concepto de la noticia, en orden (de la más concreta a la más general). */
  consultas: string[];
  /** Búsquedas genéricas de la sección, si las del concepto no dan nada (sin "requiere"). */
  respaldo?: string[];
  /** Si las etiquetas de la foto casan con esto, se descarta. */
  evitar?: RegExp;
  /** Si se indica, las etiquetas de la foto deben casar con esto. */
  requiere?: RegExp;
}

/** Fotos que delatan otro país o no pintan nada en un medio español. */
const EVITAR_SIEMPRE =
  /\b(rupee|rupees|india|indian|dollar|dollars|usd|capitol|washington|white house|united states|usa|america|american|israel|yen|yuan|renminbi|pound sterling|budapest|hungary|hungarian|russia|russian|ruble|rouble|london|westminster|big ben|berlin|reichstag|halloween|christmas|wedding)\b/i;

interface Concepto {
  patron: RegExp;
  busqueda: Busqueda;
}

/**
 * Conceptos ordenados del más concreto al más general: gana el primero que
 * aparezca en el titular.
 */
const CONCEPTOS: Concepto[] = [
  {
    patron: /banco de espa[ñn]a/i,
    busqueda: {
      consultas: ['madrid cibeles', 'madrid gran via building', 'madrid architecture', 'bank of spain madrid'],
      requiere: /madrid|spain|spanish|cibeles|bank/i,
      evitar: /sculpture|statue|face|head|portrait|relief|mask|woman|man\b/i,
    },
  },
  {
    patron: /\bbce\b|banco central europeo/i,
    busqueda: { consultas: ['european central bank', 'euro banknotes', 'euro currency'] },
  },
  {
    patron: /puigdemont|proc[eé]s|independentis|catalu[ñn]a|catalunya|generalitat|amnist[ií]a/i,
    busqueda: {
      consultas: ['catalonia spain flags', 'spanish catalan flag', 'spain flag', 'spanish flag', 'catalonia flag'],
      // Una bandera (o la Constitución) y que sea de España o Cataluña.
      requiere: /^(?=.*\b(flag|flags|bandera|constitution)\b)(?=.*\b(spain|spanish|catalonia|catalan|catalunya|españa)\b)/i,
      evitar: /protest|demonstration|crowd|riot|mallorca|majorca|balear|palma|aragon|valencia|valencian|roussillon|perpignan/i,
    },
  },
  {
    patron: /ley de nietos|nacionalidad|pasaporte|nacionalizad/i,
    busqueda: {
      consultas: ['spanish passport', 'spain passport', 'spain flag waving', 'spanish flag balcony', 'spain flag sky', 'spanish flag building'],
      // Foto real: un pasaporte o la bandera ondeando (mástil, balcón, cielo, edificio).
      requiere: /^(?=.*\b(spain|spanish|españa|espana)\b)(?=.*\b(passport|pasaporte|flag|flags|bandera)\b)(?=.*\b(passport|pasaporte|waving|wind|sky|pole|flagpole|balcony|building|street|city)\b)/i,
      evitar: /3d|render|illustration|icon|clipart|button|badge|emblem|symbol|circle|round|sphere|heart|map|vector|graphic|digital|steps|rome|roma|italy|italian/i,
    },
  },
  {
    patron: /elecci[oó]n|elecciones|votar|voto|votaci[oó]n|censo electoral|urnas?\b|29-n/i,
    busqueda: {
      consultas: ['person voting ballot box', 'hand ballot box vote', 'voting envelope ballot box', 'polling station voting', 'ballot box election'],
      requiere: /\b(ballot|vote|voting|election|elections|urn|polling)\b/i,
      // Fotos reales de gente votando: fuera renders 3D, iconos y candados.
      evitar: /german|germany|bundestag|deutschland|usa|america|american|trump|biden|brexit|uk\b|india|africa|wahl|kommunal|3d|render|illustration|icon|padlock|lock\b|clipart/i,
    },
  },
  {
    patron: /supremo|constitucional|tribunal|sentencia|juez|jueza|juzgado/i,
    busqueda: { consultas: ['justice gavel law', 'judge gavel court', 'law books justice'] },
  },
  {
    patron: /congreso|diputados|senado|decreto|parlamento|consejo de ministros/i,
    busqueda: {
      consultas: ['congress of deputies madrid', 'spanish parliament madrid', 'spain flag', 'spanish flag'],
      // Tiene que ser España Y algo institucional (parlamento, congreso o la bandera).
      requiere: /^(?=.*\b(spain|spanish|madrid|españa)\b)(?=.*\b(flag|bandera|parliament|congress|congreso|government)\b)/i,
    },
  },
  {
    patron: /seguridad social|pensi[oó]n|pensiones|jubila|pensionista/i,
    busqueda: { consultas: ['senior couple retirement', 'elderly hands euro coins', 'retirement pension savings'] },
  },
  {
    patron: /irpf|hacienda|agencia tributaria|declaraci[oó]n de la renta|impuesto|tribut|fiscal|grava/i,
    busqueda: {
      // Con euros: así la foto es de aquí y no un impreso en otro idioma.
      consultas: ['euro calculator money', 'euro banknotes calculator', 'euro tax money documents'],
      requiere: /\beuros?\b/i,
    },
  },
  {
    patron: /eur[ií]bor|hipoteca|hipotecari/i,
    busqueda: { consultas: ['mortgage house keys', 'house model euro money', 'mortgage contract signing'] },
  },
  {
    patron: /alquiler|alquilar|inquilin|casero|arrendad|renta del alquiler/i,
    busqueda: { consultas: ['apartment keys rent', 'apartment building balconies', 'rental flat keys door'] },
  },
  {
    patron: /comprar (una )?(casa|vivienda|piso)|vivienda|inmobiliari/i,
    busqueda: { consultas: ['house keys new home', 'residential building apartments', 'real estate house'] },
  },
  {
    patron: /\bluz\b|pvpc|electricidad|el[eé]ctric|factura de la luz|tarifa/i,
    busqueda: { consultas: ['electricity meter', 'electric bill energy', 'power socket plug energy'] },
  },
  {
    patron: /\bipc\b|inflaci[oó]n|precios|cesta de la compra|supermercado/i,
    busqueda: { consultas: ['supermarket shopping cart', 'grocery shopping prices', 'shopping basket food'] },
  },
  {
    patron: /dep[oó]sito|cuenta remunerada|ahorro|ahorrar|inter[eé]s/i,
    busqueda: { consultas: ['euro savings piggy bank', 'euro coins savings', 'saving money euro'] },
  },
  {
    patron: /sueldo|salario|n[oó]mina|trabajador/i,
    busqueda: { consultas: ['salary payslip money', 'euro banknotes wallet', 'office worker money'] },
  },
  {
    patron: /bolsa|acciones|cotiza|inversi[oó]n/i,
    busqueda: { consultas: ['stock market chart', 'stock exchange trading screen'] },
  },
];

/** Respaldo por sección si el titular no encaja con ningún concepto. */
const POR_SECCION: Record<string, string[]> = {
  actualidad: ['spain newspaper news', 'madrid street people'],
  politica: ['spanish parliament madrid', 'parliament session'],
  sociedad: ['people street spain', 'crowd city spain'],
  vivienda: ['residential building apartments', 'house keys new home'],
  alquiler: ['apartment keys rent', 'apartment building balconies'],
  ahorro: ['euro savings piggy bank', 'euro coins savings'],
  impuestos: ['tax form calculator', 'taxes paperwork calculator'],
  pensiones: ['senior couple retirement', 'elderly hands euro coins'],
  precios: ['supermarket shopping cart', 'grocery shopping prices'],
  bolsa: ['stock market chart', 'stock exchange trading screen'],
};

/**
 * Qué buscar para la foto de una noticia: el concepto del titular y, como red de
 * seguridad, el de su sección.
 */
export function busquedaParaArticulo(categoria: string, titulo = ''): Busqueda {
  const concepto = CONCEPTOS.find((c) => c.patron.test(titulo));
  const seccion = POR_SECCION[categoria] ?? ['spain city', 'euro money'];
  return {
    consultas: concepto?.busqueda.consultas ?? [],
    respaldo: seccion,
    evitar: concepto?.busqueda.evitar,
    requiere: concepto?.busqueda.requiere,
  };
}

export function hayClaveFotos(): boolean {
  return Boolean(process.env.PIXABAY_API_KEY || process.env.PEXELS_API_KEY);
}

export function huella(buf: Buffer): string {
  return createHash('md5').update(buf).digest('hex');
}

/**
 * Huellas de todas las fotos que ya usa la web (public/imagenes y subcarpetas),
 * salvo la del propio artículo. Sirve para no repetir nunca una foto.
 */
export function huellasEnUso(dirImagenes: string, excluirSlug?: string): Set<string> {
  const out = new Set<string>();
  const recorrer = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const f of readdirSync(dir)) {
      const ruta = resolve(dir, f);
      if (statSync(ruta).isDirectory()) {
        recorrer(ruta);
        continue;
      }
      if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
      if (excluirSlug && basename(f).replace(/\.[^.]+$/, '') === excluirSlug) continue;
      out.add(huella(readFileSync(ruta)));
    }
  };
  recorrer(dirImagenes);
  return out;
}

/** ¿Encajan las etiquetas/descripción de la foto con lo que buscamos? */
export function fotoAdmisible(etiquetas: string, b: Pick<Busqueda, 'evitar' | 'requiere'>): boolean {
  if (EVITAR_SIEMPRE.test(etiquetas)) return false;
  if (b.evitar?.test(etiquetas)) return false;
  if (b.requiere && !b.requiere.test(etiquetas)) return false;
  return true;
}

/** Descarga la imagen y la guarda SOLO si no es igual a otra ya usada en la web. */
async function guardarSiNueva(urlImagen: string, opts: Opts): Promise<boolean> {
  const ir = await fetch(urlImagen);
  if (!ir.ok) return false;
  const buf = Buffer.from(await ir.arrayBuffer());
  const h = huella(buf);
  const usadas = opts.usadas ?? huellasEnUso(dirname(opts.destinoAbsSinExt), opts.slug);
  if (usadas.has(h)) return false; // repetida: probamos con la siguiente
  writeFileSync(`${opts.destinoAbsSinExt}.jpg`, buf);
  usadas.add(h);
  return true;
}

async function pixabay(query: string, opts: Opts): Promise<FotoDescargada | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  const url =
    'https://pixabay.com/api/?image_type=photo&orientation=horizontal&safesearch=true&lang=en&per_page=40&key=' +
    encodeURIComponent(key) +
    '&q=' +
    encodeURIComponent(query);
  const r = await fetch(url);
  if (!r.ok) return null;
  const data = (await r.json()) as {
    hits?: { largeImageURL?: string; webformatURL?: string; user?: string; tags?: string }[];
  };
  // Primera foto admisible que NO esté ya usada en otro artículo.
  for (const hit of data.hits ?? []) {
    const img = hit.largeImageURL ?? hit.webformatURL;
    if (!img || !fotoAdmisible(hit.tags ?? '', opts.busqueda)) continue;
    if (!(await guardarSiNueva(img, opts))) continue;
    return {
      rutaPublica: `/imagenes/${opts.slug}.jpg`,
      credito: `Foto: ${hit.user ?? 'Pixabay'} (Pixabay)`,
      alt: opts.altBase,
    };
  }
  return null;
}

async function pexels(query: string, opts: Opts): Promise<FotoDescargada | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const url =
    'https://api.pexels.com/v1/search?orientation=landscape&per_page=40&query=' + encodeURIComponent(query);
  const r = await fetch(url, { headers: { Authorization: key } });
  if (!r.ok) return null;
  const data = (await r.json()) as {
    photos?: { src?: { landscape?: string; large?: string }; photographer?: string; alt?: string }[];
  };
  for (const foto of data.photos ?? []) {
    const img = foto.src?.landscape ?? foto.src?.large;
    if (!img || !fotoAdmisible(foto.alt ?? '', opts.busqueda)) continue;
    if (!(await guardarSiNueva(img, opts))) continue;
    return {
      rutaPublica: `/imagenes/${opts.slug}.jpg`,
      credito: `Foto: ${foto.photographer ?? 'Pexels'} (Pexels)`,
      alt: opts.altBase,
    };
  }
  return null;
}

interface Opts {
  busqueda: Busqueda;
  destinoAbsSinExt: string;
  slug: string;
  altBase: string;
  /** Huellas de las fotos ya usadas en la web (si no se pasa, se calcula del disco). */
  usadas?: Set<string>;
}

/**
 * Descarga una foto con licencia al destino indicado, probando las búsquedas en
 * orden. Pixabay primero, Pexels después.
 */
export async function descargarFoto(opts: Opts): Promise<FotoDescargada | null> {
  // Calculamos una vez las fotos ya usadas para no repetir ninguna.
  opts.usadas ??= huellasEnUso(dirname(opts.destinoAbsSinExt), opts.slug);
  const especificas = opts.busqueda.consultas.map((q) => ({ q, b: opts.busqueda }));
  const genericas = (opts.busqueda.respaldo ?? []).map((q) => ({ q, b: { ...opts.busqueda, requiere: undefined } }));
  for (const { q, b } of [...especificas, ...genericas]) {
    try {
      const o = { ...opts, busqueda: b };
      const foto = (await pixabay(q, o)) ?? (await pexels(q, o));
      if (foto) return foto;
    } catch {
      // probamos la siguiente búsqueda
    }
  }
  return null;
}
