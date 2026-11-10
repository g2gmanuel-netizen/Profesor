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
    'Tu dinero y la actualidad de España, con cabeza: política, sociedad y economía doméstica. Qué ha pasado, por qué importa y qué puedes hacer. Con rigor, con fuentes y sin postureo.',
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
    'Daniel Arcos es el seudónimo con el que firma el editor de Bolsillo Diario. Coordina la redacción y revisa cada pieza antes de publicarla. Escribe sobre impuestos, vivienda, ahorro y pensiones con un objetivo: que entiendas, con datos oficiales y sin jerga, qué significa cada noticia para tu bolsillo y qué puedes hacer.',
  // Datos legales (titular responsable del medio). Públicos en el aviso legal (LSSI).
  legal: {
    titular: 'Sr. González',
  },
  redes: {
    x: '',
    telegram: '',
  },
  adsense: {
    activo: env('ADSENSE_ACTIVO', 'true') === 'true',
    clientId: env('ADSENSE_CLIENT_ID', 'ca-pub-8207466106350245'),
  },
  /**
   * Afiliación: recuadros de productos financieros relacionados (enlaces de tus programas
   * de afiliados: financeAds, Awin, bancos…). Un recuadro sin `url` no se muestra.
   */
  afiliados: {
    hipoteca: {
      titulo: 'Antes de firmar, compara hipotecas',
      texto:
        'Unas décimas de diferencia en el tipo de interés suponen miles de euros a lo largo del préstamo. Un comparador te enseña en minutos las ofertas de varios bancos para tu caso.',
      boton: 'Comparar hipotecas',
      url: '',
    },
    cuentaRemunerada: {
      titulo: 'Que tus ahorros no pierdan valor',
      texto:
        'Con la inflación, el dinero parado en una cuenta sin intereses pierde poder de compra cada año. Las cuentas remuneradas pagan intereses por tu saldo, sin comisiones y con el dinero disponible.',
      boton: 'Ver cuentas remuneradas',
      url: '',
    },
    nomina: {
      titulo: '¿Tu banco te paga por tener la nómina?',
      texto:
        'Varios bancos regalan dinero o pagan intereses por domiciliar la nómina, sin comisiones. Si tu banco no te da nada a cambio, quizá te convenga comparar.',
      boton: 'Ver cuentas nómina',
      url: '',
    },
  } as Record<string, { titulo: string; texto: string; boton: string; url: string }>,
  /**
   * Adsterra (solo banners). Cada unidad: clave y script que da el panel («GET CODE»).
   * Una unidad vacía ('') no se usa. Los banners solo se cargan si el lector acepta cookies.
   */
  adsterra: {
    activo: env('ADSTERRA_ACTIVO', 'true') === 'true',
    unidades: {
      '300x250': '728e95615f64ac90f2b8e15d433c0969',
      '160x600': '051561153e4cde724fa59558f141b778',
      '728x90': 'aef3990db5c5479ec33a50a9750ec0ec',
      '320x50': 'd7ecf2129ad631d918cf0874181db3e2',
    } as Record<string, string>,
    script: (clave: string) => `https://bicea.org/22/${clave}`,
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
    slug: 'bolsa',
    nombre: 'Bolsa',
    descripcion:
      'Análisis semanal en profundidad de una acción de un sector emergente: números reales, catalizadores, calificaciones y escenarios. Contenido divulgativo: no es asesoramiento ni una recomendación de inversión.',
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
    descripcion:
      'Compra, obra nueva, precios, hipotecas y Euríbor: todo sobre el mercado residencial en España.',
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
  alquiler: ['#1f6f8b', '#2b8aa8'],
  ahorro: ['#0b5d3b', '#0e7a4e'],
  impuestos: ['#8a3b2a', '#b04f39'],
  pensiones: ['#355070', '#4a6b97'],
  precios: ['#b4531a', '#d47636'],
  bolsa: ['#0a4d5c', '#0e7490'],
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
