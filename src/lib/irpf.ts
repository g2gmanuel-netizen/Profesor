/**
 * Motor de cálculo del IRPF (territorio común) para la calculadora de la web.
 * Sigue el esquema del modelo 100: rendimientos → bases imponibles → reducciones →
 * bases liquidables → cuotas íntegras (estatal + autonómica) → deducciones →
 * cuota líquida → cuota diferencial (a pagar o a devolver).
 *
 * Es una simulación informativa: simplifica algunos supuestos (mínimos autonómicos
 * propios, deducciones autonómicas, compensaciones de años anteriores…).
 */

export type Tramo = [hasta: number, tipo: number];
export const INF = Number.POSITIVE_INFINITY;

export const EJERCICIO = 2026;

/** Escala estatal de la base liquidable general (art. 63 LIRPF). */
export const ESCALA_ESTATAL: Tramo[] = [
  [12450, 9.5],
  [20200, 12],
  [35200, 15],
  [60000, 18.5],
  [300000, 22.5],
  [INF, 24.5],
];

/** Escala del ahorro: mitad estatal y mitad autonómica (19-21-23-27-30 % en total). */
export const ESCALA_AHORRO_MITAD: Tramo[] = [
  [6000, 9.5],
  [50000, 10.5],
  [200000, 11.5],
  [300000, 13.5],
  [INF, 15],
];

export interface Comunidad {
  slug: string;
  nombre: string;
  escala: Tramo[];
  /** Norma o fuente de la escala, para mostrarla al usuario. */
  nota: string;
  foral?: boolean;
  ceutaMelilla?: boolean;
}

/** Escalas autonómicas de la base liquidable general vigentes para 2026. */
export const COMUNIDADES: Comunidad[] = [
  {
    slug: 'andalucia',
    nombre: 'Andalucía',
    escala: [[13000, 9.5], [21100, 12], [35200, 15], [60000, 18.5], [INF, 22.5]],
    nota: 'Ley 5/2021 de Tributos Cedidos de Andalucía.',
  },
  {
    slug: 'aragon',
    nombre: 'Aragón',
    escala: [[13072.5, 9.5], [21210, 12], [36960, 15], [52500, 18.5], [60000, 20.5], [80000, 23], [90000, 24], [130000, 25], [INF, 25.5]],
    nota: 'Decreto Legislativo 1/2005 de Aragón, art. 110-1.',
  },
  {
    slug: 'asturias',
    nombre: 'Asturias',
    escala: [[12450, 9], [17707, 12], [33007, 14], [53407, 19.2], [70000, 21.5], [90000, 22.5], [175000, 25], [INF, 26]],
    nota: 'Ley 3/2025 de medidas fiscales del Principado de Asturias.',
  },
  {
    slug: 'baleares',
    nombre: 'Illes Balears',
    escala: [[10000, 9], [18000, 11.25], [30000, 14.25], [48000, 17.5], [70000, 19], [90000, 21.75], [120000, 22.75], [175000, 23.75], [INF, 24.75]],
    nota: 'Decreto Legislativo 1/2014 de Baleares y modificaciones posteriores.',
  },
  {
    slug: 'canarias',
    nombre: 'Canarias',
    escala: [[13748, 9], [19422, 11.5], [35924, 14], [57566, 18.5], [93268, 23.5], [123745, 25], [INF, 26]],
    nota: 'Decreto Legislativo 1/2009 de Canarias, deflactada por la Ley 9/2025.',
  },
  {
    slug: 'cantabria',
    nombre: 'Cantabria',
    escala: [[13000, 8.5], [21000, 11], [35200, 14.5], [60000, 18], [90000, 22.5], [INF, 24.5]],
    nota: 'Decreto Legislativo 62/2008 de Cantabria (reforma de la Ley 3/2023).',
  },
  {
    slug: 'castilla-la-mancha',
    nombre: 'Castilla-La Mancha',
    escala: [[12450, 9.5], [20200, 12], [35200, 15], [60000, 18.5], [INF, 22.5]],
    nota: 'Ley 8/2013 de Castilla-La Mancha, art. 13 bis.',
  },
  {
    slug: 'castilla-y-leon',
    nombre: 'Castilla y León',
    escala: [[12450, 9], [20200, 12], [35200, 14], [53407, 18.5], [INF, 21.5]],
    nota: 'Decreto Legislativo 1/2013 de Castilla y León.',
  },
  {
    slug: 'cataluna',
    nombre: 'Cataluña',
    escala: [[12500, 9.5], [22000, 12.5], [33000, 16], [53000, 19], [90000, 21.5], [120000, 23.5], [175000, 24.5], [INF, 25.5]],
    nota: 'Decret-llei 5/2025 de Cataluña.',
  },
  {
    slug: 'valencia',
    nombre: 'Comunitat Valenciana',
    escala: [[12000, 8.8], [22000, 11.7], [32000, 14.6], [42000, 17], [52000, 19.4], [62000, 21.9], [72000, 24.4], [100000, 26.1], [150000, 27.35], [200000, 28.35], [INF, 29.35]],
    nota: 'Ley 13/1997, art. 2, en la redacción de la Ley 5/2026 (efectos desde el 1 de enero de 2026).',
  },
  {
    slug: 'extremadura',
    nombre: 'Extremadura',
    escala: [[12450, 7.75], [20200, 9.75], [24200, 16], [35200, 17.5], [60000, 21], [80200, 23.5], [99200, 24], [120200, 24.5], [INF, 25]],
    nota: 'Decreto Legislativo 1/2018 de Extremadura, con la rebaja de la Ley 2/2026.',
  },
  {
    slug: 'galicia',
    nombre: 'Galicia',
    escala: [[12985, 9], [21068, 11.65], [35200, 14.9], [60000, 18.4], [INF, 22.5]],
    nota: 'Decreto Legislativo 1/2011 de Galicia y modificaciones posteriores.',
  },
  {
    slug: 'madrid',
    nombre: 'Comunidad de Madrid',
    escala: [[13362.22, 8.5], [19004.63, 10.7], [35425.68, 12.8], [57320.4, 17.4], [INF, 20.5]],
    nota: 'Decreto Legislativo 1/2010 de Madrid, modificado por la Ley 13/2023.',
  },
  {
    slug: 'murcia',
    nombre: 'Región de Murcia',
    escala: [[12450, 9.5], [20200, 11.2], [34000, 13.3], [60000, 17.9], [INF, 22.5]],
    nota: 'Decreto Legislativo 1/2010 de Murcia, modificado por la Ley 11/2023.',
  },
  {
    slug: 'la-rioja',
    nombre: 'La Rioja',
    escala: [[12450, 8], [20200, 10.6], [35200, 13.6], [40000, 17.8], [50000, 18.3], [60000, 19], [120000, 24.5], [INF, 27]],
    nota: 'Ley 10/2017 de La Rioja y modificaciones posteriores.',
  },
  {
    slug: 'ceuta',
    nombre: 'Ceuta',
    escala: ESCALA_ESTATAL,
    nota: 'Escala complementaria (igual a la estatal) y deducción del 60 % por rentas obtenidas en Ceuta.',
    ceutaMelilla: true,
  },
  {
    slug: 'melilla',
    nombre: 'Melilla',
    escala: ESCALA_ESTATAL,
    nota: 'Escala complementaria (igual a la estatal) y deducción del 60 % por rentas obtenidas en Melilla.',
    ceutaMelilla: true,
  },
  {
    slug: 'pais-vasco',
    nombre: 'País Vasco (régimen foral)',
    escala: ESCALA_ESTATAL,
    nota: 'Tiene un IRPF foral propio que esta calculadora no reproduce.',
    foral: true,
  },
  {
    slug: 'navarra',
    nombre: 'Navarra (régimen foral)',
    escala: ESCALA_ESTATAL,
    nota: 'Tiene un IRPF foral propio que esta calculadora no reproduce.',
    foral: true,
  },
];

/** Parámetros del ejercicio. */
export const P = {
  minimoPersonal: 5550,
  minimoMayor65: 1150,
  minimoMayor75: 1400,
  minimoDescendientes: [2400, 2700, 4000, 4500],
  minimoMenor3: 2800,
  minimoAscendiente65: 1150,
  minimoAscendiente75: 1400,
  discapacidad33: 3000,
  discapacidad65: 9000,
  discapacidadAsistencia: 3000,
  otrosGastosTrabajo: 2000,
  movilidadGeografica: 2000,
  gastoDiscapacidadActivo33: 3500,
  gastoDiscapacidadActivo65: 7750,
  colegioMax: 500,
  defensaJuridicaMax: 300,
  // Reducción por obtención de rendimientos del trabajo (art. 20 LIRPF).
  red20: { tope: 14852, maximo: 7302, tramo2: 17673.52, base2: 2364.34, fin: 19747.5, pend1: 1.75, pend2: 1.14 },
  // Deducción para perceptores del SMI (rendimientos íntegros del trabajo).
  deduccionSmi: { umbral: 17094, maximo: 590.89, pendiente: 0.2, otrasRentasMax: 6500 },
  // Seguridad Social del trabajador 2026.
  ss: {
    comunes: 4.7,
    desempleoIndefinido: 1.55,
    desempleoTemporal: 1.6,
    formacion: 0.1,
    mei: 0.15,
    baseMaximaAnual: 5101.2 * 12,
    // Cuota de solidaridad (parte del trabajador) sobre el exceso de la base máxima.
    solidaridad: [
      [0.1, 0.19],
      [0.5, 0.21],
      [INF, 0.24],
    ] as Tramo[],
    empresaAprox: 32,
  },
  planPensionesIndividual: 1500,
  planPensionesEmpresa: 8500,
  planPensionesPorcentaje: 0.3,
  conjuntaBiparental: 3400,
  conjuntaMonoparental: 2150,
  anualidadesExtra: 1980,
  dificilJustificacion: { porcentaje: 5, maximo: 2000 },
  irregular: 0.3,
  irregularMax: 300000,
  donativos: { primeros: 250, tipoPrimeros: 80, tipoResto: 40, tipoRecurrente: 45, limiteBase: 0.1 },
  partidos: { tipo: 20, max: 600 },
  vivienda: { tipo: 15, max: 9040 },
  alquilerAntiguo: { tipo: 10.05, max: 9040, desde: 17707.2, hasta: 24107.2 },
  empresaNueva: { tipo: 50, max: 100000 },
  maternidad: 1200,
  guarderia: 1000,
  familiaNumerosa: { general: 1200, especial: 2400, extra: 600 },
  discapacidadCargo: 1200,
  loteriaExento: 40000,
  loteriaTipo: 20,
};

export function aplicarEscala(base: number, escala: Tramo[]): number {
  let cuota = 0;
  let desde = 0;
  for (const [hasta, tipo] of escala) {
    if (base <= desde) break;
    cuota += (Math.min(base, hasta) - desde) * (tipo / 100);
    desde = hasta;
  }
  return cuota;
}

export function tipoMarginal(base: number, escala: Tramo[]): number {
  for (const [hasta, tipo] of escala) if (base < hasta) return tipo;
  return escala[escala.length - 1]![1];
}

export interface Datos {
  comunidad: string;
  edad: number;
  discapacidad: 'no' | '33' | '65';
  asistencia: boolean;
  tributacion: 'individual' | 'conjunta' | 'monoparental';
  // Familia
  hijos: number;
  hijosMenores3: number;
  hijosDiscapacidad: number;
  hijosDiscapacidad65: number;
  hijosCompartidos: boolean;
  ascendientes65: number;
  ascendientes75: number;
  ascendientesDiscapacidad: number;
  familiaNumerosa: 'no' | 'general' | 'especial';
  conyugeDiscapacidad: boolean;
  // Trabajo
  salario: number;
  especie: number;
  ingresoCuentaEspecie: number;
  irregularesTrabajo: number;
  pensiones: number;
  contrato: 'indefinido' | 'temporal';
  ssAutomatica: boolean;
  ssManual: number;
  sindicato: number;
  colegio: number;
  defensaJuridica: number;
  movilidad: boolean;
  retencionesTrabajo: number;
  // Capital mobiliario (ahorro)
  intereses: number;
  dividendos: number;
  seguros: number;
  gastosCustodia: number;
  retencionesCapital: number;
  // Inmuebles alquilados
  alquilerIngresos: number;
  alquilerIntereses: number;
  alquilerGastos: number;
  alquilerAmortizacionBase: number;
  alquilerMobiliario: number;
  alquilerReduccion: number;
  retencionesAlquiler: number;
  // Imputación de inmuebles a disposición
  catastralNoAlquilado: number;
  catastralRevisado: boolean;
  // Actividades económicas
  actIngresos: number;
  actGastos: number;
  actCuotaAutonomos: number;
  actMetodo: 'normal' | 'simplificada' | 'modulos';
  actModulosRendimiento: number;
  actReduccion: number;
  actRetenciones: number;
  actPagosFraccionados: number;
  // Ganancias patrimoniales
  gananciasAhorro: number;
  gananciasGeneral: number;
  loteria: number;
  // Reducciones
  planPropio: number;
  planEmpresa: number;
  pensionCompensatoria: number;
  anualidadesHijos: number;
  patrimonioProtegido: number;
  // Deducciones
  viviendaAntes2013: number;
  alquilerAntes2015: number;
  donativos: number;
  donativosRecurrentes: boolean;
  donativosPartidos: number;
  empresaNuevaCreacion: number;
  otrasDeduccionesEstatales: number;
  deduccionesAutonomicas: number;
  gastosGuarderia: number;
  anticiposCobrados: number;
}

export const DATOS_VACIOS: Datos = {
  comunidad: 'madrid',
  edad: 35,
  discapacidad: 'no',
  asistencia: false,
  tributacion: 'individual',
  hijos: 0,
  hijosMenores3: 0,
  hijosDiscapacidad: 0,
  hijosDiscapacidad65: 0,
  hijosCompartidos: false,
  ascendientes65: 0,
  ascendientes75: 0,
  ascendientesDiscapacidad: 0,
  familiaNumerosa: 'no',
  conyugeDiscapacidad: false,
  salario: 0,
  especie: 0,
  ingresoCuentaEspecie: 0,
  irregularesTrabajo: 0,
  pensiones: 0,
  contrato: 'indefinido',
  ssAutomatica: true,
  ssManual: 0,
  sindicato: 0,
  colegio: 0,
  defensaJuridica: 0,
  movilidad: false,
  retencionesTrabajo: 0,
  intereses: 0,
  dividendos: 0,
  seguros: 0,
  gastosCustodia: 0,
  retencionesCapital: 0,
  alquilerIngresos: 0,
  alquilerIntereses: 0,
  alquilerGastos: 0,
  alquilerAmortizacionBase: 0,
  alquilerMobiliario: 0,
  alquilerReduccion: 50,
  retencionesAlquiler: 0,
  catastralNoAlquilado: 0,
  catastralRevisado: true,
  actIngresos: 0,
  actGastos: 0,
  actCuotaAutonomos: 0,
  actMetodo: 'simplificada',
  actModulosRendimiento: 0,
  actReduccion: 0,
  actRetenciones: 0,
  actPagosFraccionados: 0,
  gananciasAhorro: 0,
  gananciasGeneral: 0,
  loteria: 0,
  planPropio: 0,
  planEmpresa: 0,
  pensionCompensatoria: 0,
  anualidadesHijos: 0,
  patrimonioProtegido: 0,
  viviendaAntes2013: 0,
  alquilerAntes2015: 0,
  donativos: 0,
  donativosRecurrentes: false,
  donativosPartidos: 0,
  empresaNuevaCreacion: 0,
  otrasDeduccionesEstatales: 0,
  deduccionesAutonomicas: 0,
  gastosGuarderia: 0,
  anticiposCobrados: 0,
};

export interface Linea {
  concepto: string;
  importe: number;
  nivel?: 0 | 1 | 2;
}

export interface Resultado {
  comunidad: Comunidad;
  lineas: Linea[];
  ingresosBrutos: number;
  gastosNecesarios: number;
  ssTrabajador: number;
  ssEmpresaAprox: number;
  cuotaAutonomos: number;
  baseImponibleGeneral: number;
  baseImponibleAhorro: number;
  baseLiquidableGeneral: number;
  baseLiquidableAhorro: number;
  minimoPersonalFamiliar: number;
  cuotaIntegraEstatal: number;
  cuotaIntegraAutonomica: number;
  cuotaIntegra: number;
  deducciones: number;
  cuotaLiquida: number;
  deduccionesFamiliares: number;
  pagosACuenta: number;
  cuotaDiferencial: number;
  gravamenLoteria: number;
  irpfTotal: number;
  totalEstado: number;
  netoAnual: number;
  tipoMedio: number;
  tipoMarginal: number;
  tipoMarginalAhorro: number;
  avisos: string[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const pos = (n: number) => Math.max(0, n);

function cotizacionesTrabajador(d: Datos, brutoTrabajo: number): number {
  if (!d.ssAutomatica) return d.ssManual;
  if (d.salario <= 0) return 0;
  const tipo = P.ss.comunes + P.ss.formacion + P.ss.mei + (d.contrato === 'temporal' ? P.ss.desempleoTemporal : P.ss.desempleoIndefinido);
  const base = Math.min(brutoTrabajo, P.ss.baseMaximaAnual);
  let cuota = base * (tipo / 100);
  // Cuota de solidaridad sobre lo que supera la base máxima.
  const exceso = brutoTrabajo - P.ss.baseMaximaAnual;
  if (exceso > 0) {
    let desde = 0;
    for (const [hastaRel, tipoSol] of P.ss.solidaridad) {
      const hasta = hastaRel * P.ss.baseMaximaAnual;
      if (exceso <= desde) break;
      cuota += (Math.min(exceso, hasta) - desde) * (tipoSol / 100);
      desde = hasta;
    }
  }
  return cuota;
}

function minimoDescendientes(d: Datos): number {
  let m = 0;
  for (let i = 0; i < d.hijos; i++) m += P.minimoDescendientes[Math.min(i, 3)]!;
  m += Math.min(d.hijosMenores3, d.hijos) * P.minimoMenor3;
  // Con custodia compartida, el mínimo por descendientes se prorratea a partes iguales.
  return d.hijosCompartidos ? m / 2 : m;
}

function minimoDiscapacidad(grado: 'no' | '33' | '65', asistencia: boolean): number {
  if (grado === 'no') return 0;
  const base = grado === '65' ? P.discapacidad65 : P.discapacidad33;
  return base + (asistencia || grado === '65' ? P.discapacidadAsistencia : 0);
}

export function calcular(d: Datos): Resultado {
  const comunidad = COMUNIDADES.find((c) => c.slug === d.comunidad) ?? COMUNIDADES[0]!;
  const lineas: Linea[] = [];
  const avisos: string[] = [];
  const L = (concepto: string, importe: number, nivel: 0 | 1 | 2 = 1) => lineas.push({ concepto, importe: r2(importe), nivel });

  // ── 1. Rendimientos del trabajo ──────────────────────────────────────────
  const especieTotal = d.especie + d.ingresoCuentaEspecie;
  const brutoTrabajoSinReduccion = d.salario + especieTotal + d.pensiones + d.planEmpresa;
  const irregularReduccion = Math.min(d.irregularesTrabajo, P.irregularMax) * P.irregular;
  const ingresosTrabajo = brutoTrabajoSinReduccion + d.irregularesTrabajo - irregularReduccion;
  const ss = cotizacionesTrabajador(d, d.salario + d.especie + d.irregularesTrabajo);
  let otrosGastos = ingresosTrabajo > 0 ? P.otrosGastosTrabajo : 0;
  if (d.movilidad && ingresosTrabajo > 0) otrosGastos += P.movilidadGeografica;
  if (d.discapacidad !== 'no' && d.salario > 0) {
    otrosGastos += d.discapacidad === '65' || d.asistencia ? P.gastoDiscapacidadActivo65 : P.gastoDiscapacidadActivo33;
  }
  const gastosTrabajo =
    ss + d.sindicato + Math.min(d.colegio, P.colegioMax) + Math.min(d.defensaJuridica, P.defensaJuridicaMax);
  const netoPrevio = ingresosTrabajo - gastosTrabajo;
  const otrosGastosAplicados = Math.min(otrosGastos, pos(netoPrevio));
  const rendimientoNetoTrabajoPrevio = netoPrevio - otrosGastosAplicados;

  // Reducción por obtención de rendimientos del trabajo (art. 20).
  const R = P.red20;
  let reduccion20 = 0;
  const otrasRentas = d.intereses + d.dividendos + d.alquilerIngresos + d.actIngresos + pos(d.gananciasAhorro) + pos(d.gananciasGeneral);
  if (ingresosTrabajo > 0 && otrasRentas <= 6500) {
    const rn = rendimientoNetoTrabajoPrevio;
    if (rn <= R.tope) reduccion20 = R.maximo;
    else if (rn <= R.tramo2) reduccion20 = R.maximo - R.pend1 * (rn - R.tope);
    else if (rn <= R.fin) reduccion20 = R.base2 - R.pend2 * (rn - R.tramo2);
  }
  reduccion20 = Math.min(pos(reduccion20), pos(rendimientoNetoTrabajoPrevio));
  const rendimientoTrabajo = rendimientoNetoTrabajoPrevio - reduccion20;

  L('Rendimientos del trabajo', 0, 0);
  L('Salario y otras retribuciones dinerarias', d.salario);
  if (especieTotal) L('Retribuciones en especie (incluido ingreso a cuenta)', especieTotal);
  if (d.pensiones) L('Pensiones y prestaciones', d.pensiones);
  if (d.planEmpresa) L('Aportaciones de la empresa a planes de pensiones', d.planEmpresa);
  if (d.irregularesTrabajo) L('Rendimientos irregulares (tras reducción del 30 %)', d.irregularesTrabajo - irregularReduccion);
  L('Cotizaciones a la Seguridad Social', -ss);
  if (d.sindicato || d.colegio || d.defensaJuridica)
    L('Cuotas sindicales, colegio profesional y defensa jurídica', -(gastosTrabajo - ss));
  if (otrosGastosAplicados) L('Otros gastos deducibles (2.000 € y adicionales)', -otrosGastosAplicados);
  if (reduccion20) L('Reducción por obtención de rendimientos del trabajo', -reduccion20);
  L('Rendimiento neto reducido del trabajo', rendimientoTrabajo, 2);

  // ── 2. Capital inmobiliario (alquileres) ─────────────────────────────────
  let rendimientoAlquiler = 0;
  if (d.alquilerIngresos > 0) {
    const interesesYReparacion = Math.min(d.alquilerIntereses, d.alquilerIngresos);
    const amortizacion = d.alquilerAmortizacionBase * 0.03 + d.alquilerMobiliario * 0.1;
    const neto = d.alquilerIngresos - interesesYReparacion - d.alquilerGastos - amortizacion;
    const reduccion = neto > 0 ? neto * (d.alquilerReduccion / 100) : 0;
    rendimientoAlquiler = neto - reduccion;
    L('Rendimientos del capital inmobiliario', 0, 0);
    L('Ingresos íntegros del alquiler', d.alquilerIngresos);
    L('Intereses de la financiación y reparación/conservación', -interesesYReparacion);
    if (d.alquilerGastos) L('Resto de gastos (IBI, comunidad, seguro, gestoría…)', -d.alquilerGastos);
    if (amortizacion) L('Amortización del inmueble y del mobiliario', -amortizacion);
    if (reduccion) L(`Reducción por alquiler de vivienda (${d.alquilerReduccion} %)`, -reduccion);
    L('Rendimiento neto reducido del capital inmobiliario', rendimientoAlquiler, 2);
  }

  // ── 3. Imputación de rentas inmobiliarias ────────────────────────────────
  const imputacion = d.catastralNoAlquilado * (d.catastralRevisado ? 0.011 : 0.02);
  if (imputacion) {
    L('Imputación de rentas inmobiliarias (segundas viviendas vacías)', 0, 0);
    L(`${d.catastralRevisado ? '1,1 %' : '2 %'} del valor catastral`, imputacion, 2);
  }

  // ── 4. Actividades económicas ────────────────────────────────────────────
  let rendimientoActividad = 0;
  if (d.actMetodo === 'modulos') {
    rendimientoActividad = d.actModulosRendimiento - d.actReduccion;
  } else if (d.actIngresos > 0 || d.actGastos > 0) {
    let neto = d.actIngresos - d.actGastos - d.actCuotaAutonomos;
    if (d.actMetodo === 'simplificada' && neto > 0) {
      const dj = Math.min(neto * (P.dificilJustificacion.porcentaje / 100), P.dificilJustificacion.maximo);
      neto -= dj;
    }
    rendimientoActividad = neto - d.actReduccion;
  }
  if (rendimientoActividad || d.actIngresos) {
    L('Rendimientos de actividades económicas', 0, 0);
    if (d.actMetodo !== 'modulos') {
      L('Ingresos de la actividad', d.actIngresos);
      L('Gastos deducibles (incluida la cuota de autónomos)', -(d.actGastos + d.actCuotaAutonomos));
      if (d.actMetodo === 'simplificada') L('Gastos de difícil justificación (5 %, máx. 2.000 €)', -(d.actIngresos - d.actGastos - d.actCuotaAutonomos - (rendimientoActividad + d.actReduccion)));
    } else {
      L('Rendimiento neto por módulos', d.actModulosRendimiento);
    }
    if (d.actReduccion) L('Reducciones de la actividad', -d.actReduccion);
    L('Rendimiento neto reducido de actividades', rendimientoActividad, 2);
  }

  // ── 5. Base imponible general y del ahorro ───────────────────────────────
  const baseImponibleGeneral = pos(rendimientoTrabajo + rendimientoAlquiler + imputacion + rendimientoActividad + d.gananciasGeneral);
  if (d.gananciasGeneral) L('Ganancias patrimoniales no derivadas de ventas (premios, ayudas…)', d.gananciasGeneral, 1);

  const rcmAhorro = d.intereses + d.dividendos + d.seguros - d.gastosCustodia;
  let gpAhorro = d.gananciasAhorro;
  let rcm = rcmAhorro;
  // Compensación cruzada de saldos negativos, hasta el 25 % del saldo positivo del otro bloque.
  if (rcm < 0 && gpAhorro > 0) {
    const c = Math.min(-rcm, gpAhorro * 0.25);
    gpAhorro -= c;
    rcm += c;
  } else if (gpAhorro < 0 && rcm > 0) {
    const c = Math.min(-gpAhorro, rcm * 0.25);
    rcm -= c;
    gpAhorro += c;
  }
  const baseImponibleAhorro = pos(rcm) + pos(gpAhorro);
  if (rcm < 0 || gpAhorro < 0) avisos.push('Tienes pérdidas o saldos negativos en el ahorro que no se han podido compensar del todo: podrás compensarlos en los cuatro años siguientes.');

  L('Base imponible general', baseImponibleGeneral, 0);
  L('Base imponible del ahorro', 0, 0);
  if (rcmAhorro) L('Intereses, dividendos y seguros (neto de gastos de custodia)', rcmAhorro);
  if (d.gananciasAhorro) L('Ganancias y pérdidas por ventas (acciones, fondos, inmuebles, cripto…)', d.gananciasAhorro);
  L('Base imponible del ahorro', baseImponibleAhorro, 2);

  // ── 6. Reducciones de la base imponible ──────────────────────────────────
  const limitePlanes = P.planPensionesPorcentaje * pos(rendimientoNetoTrabajoPrevio + reduccion20 + rendimientoActividad);
  const planPropio = Math.min(d.planPropio, P.planPensionesIndividual);
  const planEmpresa = Math.min(d.planEmpresa, P.planPensionesEmpresa);
  const reduccionPlanes = Math.min(planPropio + planEmpresa, limitePlanes);
  if (d.planPropio > P.planPensionesIndividual) avisos.push(`Solo puedes reducir hasta 1.500 € de aportación propia a planes de pensiones.`);
  const reduccionConjunta = d.tributacion === 'conjunta' ? P.conjuntaBiparental : d.tributacion === 'monoparental' ? P.conjuntaMonoparental : 0;
  const reduccionPatrimonio = Math.min(d.patrimonioProtegido, 10000);
  let reducciones = reduccionPlanes + d.pensionCompensatoria + reduccionConjunta + reduccionPatrimonio;
  reducciones = Math.min(reducciones, baseImponibleGeneral);
  const baseLiquidableGeneral = pos(baseImponibleGeneral - reducciones);
  // El sobrante de la reducción por tributación conjunta puede aplicarse al ahorro.
  const sobranteConjunta = pos(reduccionPlanes + d.pensionCompensatoria + reduccionConjunta + reduccionPatrimonio - baseImponibleGeneral);
  const baseLiquidableAhorro = pos(baseImponibleAhorro - Math.min(sobranteConjunta, reduccionConjunta));

  L('Reducciones de la base imponible', 0, 0);
  if (reduccionPlanes) L('Aportaciones a planes de pensiones', -reduccionPlanes);
  if (d.pensionCompensatoria) L('Pensión compensatoria al excónyuge', -d.pensionCompensatoria);
  if (reduccionConjunta) L('Reducción por tributación conjunta', -reduccionConjunta);
  if (reduccionPatrimonio) L('Aportaciones a patrimonios protegidos', -reduccionPatrimonio);
  L('Base liquidable general', baseLiquidableGeneral, 2);
  L('Base liquidable del ahorro', baseLiquidableAhorro, 2);

  // ── 7. Mínimo personal y familiar ────────────────────────────────────────
  let minimoContribuyente = P.minimoPersonal;
  if (d.edad >= 65) minimoContribuyente += P.minimoMayor65;
  if (d.edad >= 75) minimoContribuyente += P.minimoMayor75;
  const minDesc = minimoDescendientes(d);
  const minAsc = d.ascendientes65 * P.minimoAscendiente65 + d.ascendientes75 * (P.minimoAscendiente65 + P.minimoAscendiente75);
  const minDisc =
    minimoDiscapacidad(d.discapacidad, d.asistencia) +
    d.hijosDiscapacidad * P.discapacidad33 +
    d.hijosDiscapacidad65 * (P.discapacidad65 + P.discapacidadAsistencia) +
    d.ascendientesDiscapacidad * P.discapacidad33 +
    (d.conyugeDiscapacidad && d.tributacion === 'conjunta' ? P.discapacidad33 : 0);
  const minimo = minimoContribuyente + minDesc + minAsc + minDisc;
  L('Mínimo personal y familiar', 0, 0);
  L('Mínimo del contribuyente', minimoContribuyente);
  if (minDesc) L('Mínimo por descendientes', minDesc);
  if (minAsc) L('Mínimo por ascendientes', minAsc);
  if (minDisc) L('Mínimo por discapacidad', minDisc);
  L('Total mínimo personal y familiar', minimo, 2);

  // ── 8. Cuotas íntegras ───────────────────────────────────────────────────
  const escalaAuto = comunidad.escala;
  const anualidades = d.anualidadesHijos > 0 && d.anualidadesHijos < baseLiquidableGeneral ? d.anualidadesHijos : 0;
  const cuotaGeneral = (escala: Tramo[]) => {
    const minimoEnGeneral = Math.min(minimo, baseLiquidableGeneral);
    if (anualidades) {
      const c =
        aplicarEscala(baseLiquidableGeneral - anualidades, escala) +
        aplicarEscala(anualidades, escala) -
        aplicarEscala(Math.min(minimo + P.anualidadesExtra, baseLiquidableGeneral), escala);
      return pos(c);
    }
    return pos(aplicarEscala(baseLiquidableGeneral, escala) - aplicarEscala(minimoEnGeneral, escala));
  };
  const minimoRestante = pos(minimo - baseLiquidableGeneral);
  const cuotaAhorroMitad = pos(
    aplicarEscala(baseLiquidableAhorro, ESCALA_AHORRO_MITAD) - aplicarEscala(Math.min(minimoRestante, baseLiquidableAhorro), ESCALA_AHORRO_MITAD),
  );
  const cuotaIntegraEstatal = cuotaGeneral(ESCALA_ESTATAL) + cuotaAhorroMitad;
  const cuotaIntegraAutonomica = cuotaGeneral(escalaAuto) + cuotaAhorroMitad;
  const cuotaIntegra = cuotaIntegraEstatal + cuotaIntegraAutonomica;
  L('Cuotas íntegras', 0, 0);
  L('Cuota íntegra estatal', cuotaIntegraEstatal);
  L(`Cuota íntegra autonómica (${comunidad.nombre})`, cuotaIntegraAutonomica);
  L('Cuota íntegra total', cuotaIntegra, 2);

  // ── 9. Deducciones de la cuota ───────────────────────────────────────────
  const baseLiquidableTotal = baseLiquidableGeneral + baseLiquidableAhorro;
  const ded: [string, number][] = [];
  if (d.viviendaAntes2013) ded.push(['Inversión en vivienda habitual (régimen transitorio)', Math.min(d.viviendaAntes2013, P.vivienda.max) * (P.vivienda.tipo / 100)]);
  const baseImponibleTotal = baseImponibleGeneral + baseImponibleAhorro;
  if (d.alquilerAntes2015 && baseImponibleTotal < P.alquilerAntiguo.hasta) {
    const maxBase =
      baseImponibleTotal <= P.alquilerAntiguo.desde
        ? P.alquilerAntiguo.max
        : P.alquilerAntiguo.max - 1.4125 * (baseImponibleTotal - P.alquilerAntiguo.desde);
    ded.push(['Alquiler de vivienda habitual (contratos anteriores a 2015)', Math.min(d.alquilerAntes2015, pos(maxBase)) * (P.alquilerAntiguo.tipo / 100)]);
  }
  if (d.donativos) {
    const base = Math.min(d.donativos, baseLiquidableTotal * P.donativos.limiteBase);
    const primeros = Math.min(base, P.donativos.primeros);
    const resto = base - primeros;
    ded.push([
      'Donativos a ONG y fundaciones',
      primeros * (P.donativos.tipoPrimeros / 100) + resto * ((d.donativosRecurrentes ? P.donativos.tipoRecurrente : P.donativos.tipoResto) / 100),
    ]);
  }
  if (d.donativosPartidos) ded.push(['Cuotas y donativos a partidos políticos', Math.min(d.donativosPartidos, P.partidos.max) * (P.partidos.tipo / 100)]);
  if (d.empresaNuevaCreacion) ded.push(['Inversión en empresas de nueva creación', Math.min(d.empresaNuevaCreacion, P.empresaNueva.max) * (P.empresaNueva.tipo / 100)]);
  if (d.otrasDeduccionesEstatales) ded.push(['Otras deducciones estatales (eficiencia energética, vehículo eléctrico…)', d.otrasDeduccionesEstatales]);
  if (d.deduccionesAutonomicas) ded.push([`Deducciones autonómicas (${comunidad.nombre})`, d.deduccionesAutonomicas]);
  let deducciones = ded.reduce((s, [, v]) => s + v, 0);
  if (comunidad.ceutaMelilla) {
    const dcm = pos(cuotaIntegra - deducciones) * 0.6;
    ded.push([`Deducción por rentas obtenidas en ${comunidad.nombre} (60 %)`, dcm]);
    deducciones += dcm;
  }
  // Deducción por rendimientos del trabajo para perceptores del SMI.
  const S = P.deduccionSmi;
  const brutoTrabajoIntegro = d.salario + especieTotal + d.pensiones;
  const finSmi = S.umbral + S.maximo / S.pendiente;
  if (brutoTrabajoIntegro > 0 && brutoTrabajoIntegro < finSmi && otrasRentas <= S.otrasRentasMax) {
    const importe = brutoTrabajoIntegro <= S.umbral ? S.maximo : S.maximo - S.pendiente * (brutoTrabajoIntegro - S.umbral);
    const proporcionTrabajo = baseImponibleTotal > 0 ? pos(rendimientoTrabajo) / baseImponibleTotal : 0;
    const limite = pos(cuotaIntegra - deducciones) * Math.min(1, proporcionTrabajo);
    const dsmi = Math.min(pos(importe), limite);
    if (dsmi > 0) {
      ded.push(['Deducción por obtención de rendimientos del trabajo (SMI)', dsmi]);
      deducciones += dsmi;
    }
  }
  deducciones = Math.min(deducciones, cuotaIntegra);
  const cuotaLiquida = pos(cuotaIntegra - deducciones);
  if (ded.length) {
    L('Deducciones', 0, 0);
    for (const [c, v] of ded) L(c, -v);
  }
  L('Cuota líquida', cuotaLiquida, 2);

  // ── 10. Cuota diferencial ────────────────────────────────────────────────
  const hijosMaternidad = Math.min(d.hijosMenores3, d.hijos);
  const maternidad = hijosMaternidad * P.maternidad + Math.min(d.gastosGuarderia, hijosMaternidad * P.guarderia);
  let familiaNumerosa = 0;
  if (d.familiaNumerosa !== 'no') {
    const minimoHijos = d.familiaNumerosa === 'especial' ? 5 : 3;
    familiaNumerosa =
      (d.familiaNumerosa === 'especial' ? P.familiaNumerosa.especial : P.familiaNumerosa.general) +
      pos(d.hijos - minimoHijos) * P.familiaNumerosa.extra;
  }
  const discapacidadCargo =
    (d.hijosDiscapacidad + d.hijosDiscapacidad65 + d.ascendientesDiscapacidad + (d.conyugeDiscapacidad ? 1 : 0)) * P.discapacidadCargo;
  const deduccionesFamiliares = maternidad + familiaNumerosa + discapacidadCargo;
  const pagosACuenta = d.retencionesTrabajo + d.ingresoCuentaEspecie + d.retencionesCapital + d.retencionesAlquiler + d.actRetenciones + d.actPagosFraccionados;
  const cuotaDiferencial = cuotaLiquida - pagosACuenta - deduccionesFamiliares + d.anticiposCobrados;
  L('Resultado de la declaración', 0, 0);
  L('Retenciones, ingresos a cuenta y pagos fraccionados', -pagosACuenta);
  if (maternidad) L('Deducción por maternidad (y gastos de guardería)', -maternidad);
  if (familiaNumerosa) L('Deducción por familia numerosa', -familiaNumerosa);
  if (discapacidadCargo) L('Deducción por personas con discapacidad a cargo', -discapacidadCargo);
  if (d.anticiposCobrados) L('Abonos anticipados ya cobrados', d.anticiposCobrados);
  L(cuotaDiferencial >= 0 ? 'Resultado: a pagar' : 'Resultado: a devolver', cuotaDiferencial, 2);

  // ── 11. Totales para la persona ──────────────────────────────────────────
  const gravamenLoteria = pos(d.loteria - P.loteriaExento) * (P.loteriaTipo / 100);
  // Lo que de verdad pagas de IRPF en el año (negativo si Hacienda te paga por las deducciones familiares).
  const irpfTotal = cuotaLiquida - deduccionesFamiliares + d.anticiposCobrados + gravamenLoteria;
  const ingresosBrutos =
    d.salario + d.pensiones + d.irregularesTrabajo + d.intereses + d.dividendos + d.seguros + d.alquilerIngresos + d.actIngresos +
    pos(d.gananciasAhorro) + pos(d.gananciasGeneral) + d.loteria + (d.actMetodo === 'modulos' ? d.actModulosRendimiento : 0);
  const gastosNecesarios =
    (d.alquilerIngresos > 0 ? Math.min(d.alquilerIntereses, d.alquilerIngresos) + d.alquilerGastos : 0) +
    (d.actMetodo === 'modulos' ? 0 : d.actGastos) + d.gastosCustodia + d.sindicato + d.colegio + d.defensaJuridica + pos(-d.gananciasAhorro);
  const ssEmpresaAprox = Math.min(d.salario + d.especie, P.ss.baseMaximaAnual) * (P.ss.empresaAprox / 100);
  const totalEstado = irpfTotal + ss + d.actCuotaAutonomos;
  const netoAnual = ingresosBrutos - gastosNecesarios - totalEstado;
  const tipoMarginalGeneral = tipoMarginal(baseLiquidableGeneral, ESCALA_ESTATAL) + tipoMarginal(baseLiquidableGeneral, escalaAuto);
  const tipoMarginalAhorro = baseLiquidableAhorro > 0 ? 2 * tipoMarginal(baseLiquidableAhorro, ESCALA_AHORRO_MITAD) : 19;

  if (comunidad.foral) avisos.unshift(`${comunidad.nombre} tiene un IRPF propio: el resultado es solo orientativo con la normativa común.`);

  return {
    comunidad,
    lineas,
    ingresosBrutos: r2(ingresosBrutos),
    gastosNecesarios: r2(gastosNecesarios),
    ssTrabajador: r2(ss),
    ssEmpresaAprox: r2(ssEmpresaAprox),
    cuotaAutonomos: r2(d.actCuotaAutonomos),
    baseImponibleGeneral: r2(baseImponibleGeneral),
    baseImponibleAhorro: r2(baseImponibleAhorro),
    baseLiquidableGeneral: r2(baseLiquidableGeneral),
    baseLiquidableAhorro: r2(baseLiquidableAhorro),
    minimoPersonalFamiliar: r2(minimo),
    cuotaIntegraEstatal: r2(cuotaIntegraEstatal),
    cuotaIntegraAutonomica: r2(cuotaIntegraAutonomica),
    cuotaIntegra: r2(cuotaIntegra),
    deducciones: r2(deducciones),
    cuotaLiquida: r2(cuotaLiquida),
    deduccionesFamiliares: r2(deduccionesFamiliares),
    pagosACuenta: r2(pagosACuenta),
    cuotaDiferencial: r2(cuotaDiferencial),
    gravamenLoteria: r2(gravamenLoteria),
    irpfTotal: r2(irpfTotal),
    totalEstado: r2(totalEstado),
    netoAnual: r2(netoAnual),
    tipoMedio: ingresosBrutos > 0 ? r2((irpfTotal / ingresosBrutos) * 100) : 0,
    tipoMarginal: tipoMarginalGeneral,
    tipoMarginalAhorro,
    avisos,
  };
}

export interface Consejo {
  titulo: string;
  texto: string;
  ahorro?: number;
}

/** Consejos personalizados para pagar menos (siempre dentro de la ley). */
export function consejos(d: Datos, r: Resultado): Consejo[] {
  const lista: Consejo[] = [];
  const marginal = r.tipoMarginal / 100;
  const fmt = (n: number) => `${Math.round(n).toLocaleString('es-ES', { useGrouping: 'always' } as Intl.NumberFormatOptions)} €`;

  const margenPlan = P.planPensionesIndividual - Math.min(d.planPropio, P.planPensionesIndividual);
  if (margenPlan > 0 && r.baseLiquidableGeneral > 15000) {
    lista.push({
      titulo: 'Aporta a un plan de pensiones',
      texto: `Puedes aportar hasta ${fmt(margenPlan)} más este año y restarlos de tu base. Con tu tipo marginal (${r.tipoMarginal.toLocaleString('es-ES')} %) te ahorrarías unos ${fmt(margenPlan * marginal)}. Ojo: el dinero queda inmovilizado hasta la jubilación (o 10 años de antigüedad) y tributa al rescatarlo. Si tu empresa tiene plan de empleo, puedes llegar a 10.000 € con sus aportaciones.`,
      ahorro: margenPlan * marginal,
    });
  }
  if (d.donativos < P.donativos.primeros) {
    const falta = P.donativos.primeros - d.donativos;
    lista.push({
      titulo: 'Los primeros 250 € donados te salen casi gratis',
      texto: `Hacienda te devuelve el 80 % de los primeros 250 € que dones a ONG o fundaciones acogidas a la Ley de Mecenazgo. Donando ${fmt(falta)} más, te deducirías ${fmt(falta * 0.8)}. A partir de ahí, el 40 % (45 % si repites con la misma entidad tres años).`,
      ahorro: falta * 0.8,
    });
  }
  if (d.alquilerIngresos > 0 && d.alquilerReduccion < 90) {
    lista.push({
      titulo: 'Revisa la reducción de tu alquiler',
      texto:
        'Si alquilas como vivienda habitual, desde 2024 la reducción puede ser del 50 % al 90 %: 90 % si firmas un contrato nuevo en zona tensionada bajando la renta más de un 5 %; 70 % si alquilas por primera vez a jóvenes de 18 a 35 años en zona tensionada o a precio asequible; 60 % si has hecho obras de rehabilitación en los dos años anteriores. Además, deduce todos los gastos: IBI, comunidad, seguro, intereses, reparaciones y la amortización del 3 %.',
    });
  }
  if (d.alquilerIngresos > 0 && d.alquilerAmortizacionBase === 0) {
    lista.push({
      titulo: 'No te olvides de la amortización',
      texto: 'Puedes restar cada año el 3 % del valor de la construcción del piso que alquilas (sin el suelo). Es uno de los gastos que más se olvidan y suele suponer cientos de euros.',
    });
  }
  if (d.tributacion === 'individual' && d.hijos > 0) {
    lista.push({
      titulo: 'Compara individual y conjunta',
      texto: 'Si tu pareja gana poco o nada, la declaración conjunta reduce la base en 3.400 €. Prueba la calculadora con las dos opciones y quédate con la que salga mejor. Hacienda te deja elegir cada año.',
    });
  }
  if (d.hijosMenores3 > 0 && d.gastosGuarderia === 0) {
    lista.push({
      titulo: 'Guardería: hasta 1.000 € más por hijo',
      texto: 'Si tienes hijos menores de 3 años en una guardería o centro de educación infantil autorizado, la deducción por maternidad se incrementa hasta 1.000 € por los gastos de custodia no subvencionados.',
    });
  }
  if (r.baseImponibleAhorro > 0 || d.gananciasAhorro > 0) {
    lista.push({
      titulo: 'Compensa ganancias con pérdidas',
      texto: 'Si tienes acciones o fondos con pérdidas latentes, venderlos antes del 31 de diciembre permite compensarlas con tus ganancias del año. No vuelvas a comprar los mismos valores en los dos meses siguientes o la pérdida no se computa. Y recuerda: cambiar de un fondo de inversión a otro no tributa (traspaso).',
    });
  }
  if (d.salario > 0) {
    lista.push({
      titulo: 'Pide retribución flexible a tu empresa',
      texto: 'Parte del sueldo puede cobrarse en especie sin tributar: seguro médico (hasta 500 € al año por persona), cheque guardería, tarjeta de transporte (hasta 1.500 € al año), formación y comida (hasta 11 € al día en tarjeta restaurante). Cobras lo mismo y pagas menos IRPF.',
    });
  }
  if (d.actIngresos > 0 && d.actMetodo !== 'modulos') {
    lista.push({
      titulo: 'Autónomo: aprovecha todos los gastos',
      texto: 'Deduce la cuota de autónomos, el seguro de salud (hasta 500 € por persona de tu familia), suministros si trabajas en casa (30 % de la parte proporcional de la vivienda afecta), gestoría, móvil, software y dietas pagadas por medios electrónicos. Si eres autónomo, el límite del plan de pensiones puede llegar a 5.750 € con un plan simplificado.',
    });
  }
  lista.push({
    titulo: 'Revisa las deducciones de tu comunidad',
    texto: `${r.comunidad.nombre} tiene deducciones propias que mucha gente no aplica: alquiler de vivienda para jóvenes, nacimiento o adopción, gastos educativos, cuidado de hijos o mayores, eficiencia energética, residencia en zonas rurales… Consulta la lista oficial de la Agencia Tributaria para tu comunidad y añádelas en la casilla «Deducciones autonómicas».`,
  });
  if (r.cuotaDiferencial > 0) {
    lista.push({
      titulo: 'Si te sale a pagar, ajusta tu retención',
      texto: 'Puedes pedir a tu empresa que te retenga más cada mes (modelo 145) para no llevarte un susto en la renta. Y si te sale a pagar, puedes fraccionar el pago: 60 % en junio y 40 % en noviembre, sin intereses.',
    });
  }
  return lista;
}
