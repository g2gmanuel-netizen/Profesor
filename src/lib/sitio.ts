/**
 * Configuración central del medio. Un único sitio del que beben web, agentes y panel.
 * Los valores sensibles o personalizables llegan por variables de entorno.
 */

function env(nombre: string, porDefecto = ''): string {
  const v = import.meta.env?.[nombre] ?? process.env?.[nombre];
  return v && v.length > 0 ? v : porDefecto;
}

export const SITIO = {
  nombre: env('NOMBRE_MEDIO', 'Bolsillo Diario'),
  descripcion:
    'La actualidad de España explicada claro: política, sociedad, economía y lo que afecta a tu bolsillo. Qué ha pasado, por qué importa y qué significa para ti, sin tecnicismos.',
  nicho:
    'actualidad de España explicada de forma sencilla: política y leyes (decretos, normativa), sociedad, economía del país y economía doméstica (vivienda, alquiler, hipotecas, ahorro, impuestos, pensiones, precios)',
  idioma: 'es-ES',
  dominio: env('DOMINIO', 'tubolsillodiario.com'),
  get url(): string {
    const d = this.dominio;
    return d && d !== '[PENDIENTE]' ? `https://${d}` : 'https://ejemplo.local';
  },
  emailContacto: env('EMAIL_CONTACTO', 'g2gmanuel@gmail.com'),
  autorBio:
    'Economía doméstica en España explicada claro, con fuentes oficiales y revisión editorial.',
  // Datos legales (titular responsable del medio). Públicos en el aviso legal (LSSI).
  legal: {
    titular: env('AUTOR_RESPONSABLE', 'Manuel González'),
    nif: '02307212J',
    domicilio: 'Calle General Rodrigo, 2',
  },
  redes: {
    x: '',
    telegram: '',
  },
  adsense: {
    activo: env('ADSENSE_ACTIVO', 'false') === 'true',
    clientId: env('ADSENSE_CLIENT_ID', ''),
  },
  cmp: {
    activo: env('CMP_ACTIVO', 'true') === 'true',
    proveedor: env('CMP_PROVEEDOR', 'google'),
  },
  ga4Id: env('GA4_ID', 'G-2V4428ZNLE'),
  newsletterUrl: env('NEWSLETTER_ACTION_URL', ''),
} as const;

export interface Categoria {
  slug: string;
  nombre: string;
  descripcion: string;
}

export const CATEGORIAS: Categoria[] = [
  {
    slug: 'actualidad',
    nombre: 'Actualidad',
    descripcion: 'Lo que pasa hoy en España, explicado claro y al grano.',
  },
  {
    slug: 'politica',
    nombre: 'Política',
    descripcion: 'Leyes, decretos y decisiones que te afectan, sin tecnicismos.',
  },
  {
    slug: 'sociedad',
    nombre: 'Sociedad',
    descripcion: 'Los temas que mueven a la sociedad, con contexto y datos.',
  },
  {
    slug: 'vivienda',
    nombre: 'Vivienda',
    descripcion: 'Compra, obra nueva, precios y mercado residencial en España.',
  },
  {
    slug: 'hipotecas',
    nombre: 'Hipotecas',
    descripcion: 'Euríbor, tipos, cuotas y cómo afectan a tu préstamo.',
  },
  {
    slug: 'alquiler',
    nombre: 'Alquiler',
    descripcion: 'Rentas, contratos, ayudas y regulación del alquiler.',
  },
  {
    slug: 'ahorro',
    nombre: 'Ahorro',
    descripcion: 'Depósitos, cuentas, inversión conservadora y planificación.',
  },
  {
    slug: 'impuestos',
    nombre: 'Impuestos',
    descripcion: 'IRPF, IVA, declaraciones y novedades fiscales que tocan tu bolsillo.',
  },
  {
    slug: 'pensiones',
    nombre: 'Pensiones',
    descripcion: 'Jubilación, revalorización y Seguridad Social.',
  },
  {
    slug: 'precios',
    nombre: 'Precios',
    descripcion: 'IPC, luz, combustibles, alimentación y coste de la vida.',
  },
];

export function categoriaPorSlug(slug: string): Categoria | undefined {
  return CATEGORIAS.find((c) => c.slug === slug);
}

/** Color de cada sección, para las imágenes de portada propias (degradado). */
export const COLORES_CATEGORIA: Record<string, [string, string]> = {
  actualidad: ['#1f6f8b', '#2b8aa8'],
  politica: ['#6a3d9a', '#8a5cc0'],
  sociedad: ['#b4531a', '#d47636'],
  vivienda: ['#0b5d3b', '#0e7a4e'],
  hipotecas: ['#0b5d3b', '#0e7a4e'],
  alquiler: ['#1f6f8b', '#2b8aa8'],
  ahorro: ['#0b5d3b', '#0e7a4e'],
  impuestos: ['#8a3b2a', '#b04f39'],
  pensiones: ['#355070', '#4a6b97'],
  precios: ['#b4531a', '#d47636'],
};

export function colorCategoria(slug: string): [string, string] {
  return COLORES_CATEGORIA[slug] ?? ['#0b5d3b', '#0e7a4e'];
}

export function slugAutor(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
