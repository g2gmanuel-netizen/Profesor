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
    'Economía doméstica en España explicada claro: vivienda, alquiler, hipotecas, ahorro, impuestos, pensiones y precios. Qué significa cada noticia para tu bolsillo.',
  nicho:
    'economía doméstica en España: vivienda, alquiler, hipotecas, ahorro, impuestos, pensiones y precios',
  idioma: 'es-ES',
  dominio: env('DOMINIO', '[PENDIENTE]'),
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
    activo: env('CMP_ACTIVO', 'false') === 'true',
    proveedor: env('CMP_PROVEEDOR', 'google'),
  },
  ga4Id: env('GA4_ID', ''),
  newsletterUrl: env('NEWSLETTER_ACTION_URL', ''),
} as const;

export interface Categoria {
  slug: string;
  nombre: string;
  descripcion: string;
}

export const CATEGORIAS: Categoria[] = [
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

export function slugAutor(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
