import type { Candidato, Hecho, Fuente } from './esquemas';

/**
 * Datos simulados para ejecutar TODO el pipeline sin gastar API (--sin-api).
 * Cada tema trae ya sus hechos con fuente, para que el investigador (en modo
 * simulación) construya la ficha y el redactor escriba solo con esos hechos.
 */
export interface FixtureTema {
  candidato: Candidato;
  hechos: Hecho[];
  contexto: string[];
  fuentes: Fuente[];
  datosNumericos: { etiqueta: string; valor: number; unidad?: string }[];
  titularesAlternativos: string[];
  etiquetas: string[];
}

export const FIXTURES: FixtureTema[] = [
  {
    candidato: {
      id: 'fx-euribor-2026-09',
      titulo: 'El Euríbor de septiembre baja y abarata las hipotecas variables',
      resumenFuente:
        'El Banco de España publica el dato mensual del Euríbor, principal índice de las hipotecas variables en España.',
      url: 'https://www.bde.es/webbe/es/estadisticas/compartido/datos/html/tipos-interes-euribor.html',
      fechaDeteccion: '2026-09-30',
      organismo: 'Banco de España',
      categoriaSugerida: 'hipotecas',
    },
    hechos: [
      {
        afirmacion: 'El Euríbor a 12 meses cerró septiembre de 2026 en el 2,1 % de media mensual.',
        url: 'https://www.bde.es/webbe/es/estadisticas/compartido/datos/html/tipos-interes-euribor.html',
        organismo: 'Banco de España',
      },
      {
        afirmacion:
          'El Euríbor es el índice de referencia de la mayoría de las hipotecas a tipo variable en España.',
        url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32016R1011',
        organismo: 'Diario Oficial de la UE',
      },
      {
        afirmacion:
          'La revisión de la cuota se aplica cada 6 o 12 meses según lo pactado en el contrato.',
        url: 'https://www.bde.es/webbe/es/estadisticas/compartido/datos/html/tipos-interes-euribor.html',
        organismo: 'Banco de España',
      },
    ],
    contexto: [
      'Un año antes, en septiembre de 2025, el índice se situaba en niveles más altos, por lo que las revisiones anuales salen más baratas.',
    ],
    fuentes: [
      {
        titulo: 'Euríbor — Banco de España',
        url: 'https://www.bde.es/webbe/es/estadisticas/compartido/datos/html/tipos-interes-euribor.html',
        organismo: 'Banco de España',
      },
      {
        titulo: 'Reglamento (UE) 2016/1011 sobre índices de referencia',
        url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32016R1011',
        organismo: 'Diario Oficial de la UE',
      },
    ],
    datosNumericos: [{ etiqueta: 'Euríbor 12m septiembre 2026', valor: 2.1, unidad: '%' }],
    titularesAlternativos: [
      'El Euríbor baja al 2,1 % en septiembre: así cambia tu hipoteca',
      'Hipotecas más baratas: el Euríbor cierra septiembre en el 2,1 %',
      'Qué significa el Euríbor al 2,1 % para tu cuota mensual',
    ],
    etiquetas: ['euríbor', 'hipoteca variable', 'tipos de interés'],
  },
  {
    candidato: {
      id: 'fx-ipc-2026-09',
      titulo: 'El IPC de septiembre y qué sube más en la cesta de la compra',
      resumenFuente:
        'El INE publica el Índice de Precios de Consumo, que mide la inflación y el coste de la vida.',
      url: 'https://www.ine.es/',
      fechaDeteccion: '2026-09-29',
      organismo: 'INE',
      categoriaSugerida: 'precios',
    },
    hechos: [
      {
        afirmacion:
          'El INE publica mensualmente el IPC, que mide la variación de los precios de bienes y servicios de consumo.',
        url: 'https://www.ine.es/',
        organismo: 'INE',
      },
      {
        afirmacion:
          'El IPC se utiliza como referencia para actualizar algunas rentas, contratos y pensiones.',
        url: 'https://www.ine.es/',
        organismo: 'INE',
      },
    ],
    contexto: [
      'La evolución del IPC afecta directamente al poder adquisitivo de los hogares y a la actualización de rentas de alquiler.',
    ],
    fuentes: [
      {
        titulo: 'Índice de Precios de Consumo (IPC) — INE',
        url: 'https://www.ine.es/',
        organismo: 'INE',
      },
    ],
    datosNumericos: [],
    titularesAlternativos: [
      'IPC de septiembre: qué productos suben más y cómo te afecta',
      'Así queda tu cesta de la compra con el nuevo IPC',
      'El coste de la vida en septiembre, explicado',
    ],
    etiquetas: ['ipc', 'inflación', 'coste de la vida'],
  },
  {
    candidato: {
      id: 'fx-pensiones-2026',
      titulo: 'Cómo se revalorizan las pensiones y qué cobrarás en 2027',
      resumenFuente:
        'La Seguridad Social informa sobre el mecanismo de revalorización anual de las pensiones contributivas.',
      url: 'https://www.seg-social.es/',
      fechaDeteccion: '2026-09-28',
      organismo: 'Seguridad Social',
      categoriaSugerida: 'pensiones',
    },
    hechos: [
      {
        afirmacion:
          'Las pensiones contributivas se revalorizan cada año conforme a la normativa de Seguridad Social.',
        url: 'https://www.seg-social.es/',
        organismo: 'Seguridad Social',
      },
      {
        afirmacion:
          'La revalorización se aplica de forma automática a la nómina de la pensión a partir de enero.',
        url: 'https://www.seg-social.es/',
        organismo: 'Seguridad Social',
      },
    ],
    contexto: [
      'La revalorización busca mantener el poder adquisitivo de los pensionistas frente a la evolución de los precios.',
    ],
    fuentes: [
      {
        titulo: 'Revalorización de pensiones — Seguridad Social',
        url: 'https://www.seg-social.es/',
        organismo: 'Seguridad Social',
      },
    ],
    datosNumericos: [],
    titularesAlternativos: [
      'Pensiones 2027: cómo se calcula lo que vas a cobrar',
      'Revalorización de las pensiones: así afecta a tu nómina',
      'Qué pasa con tu pensión el próximo enero',
    ],
    etiquetas: ['pensiones', 'seguridad social', 'jubilación'],
  },
];
