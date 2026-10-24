/**
 * Jugadas estratégicas (y legales) para pagar menos IRPF. A diferencia de los
 * consejos de irpf.ts, que reaccionan a casillas concretas, aquí van decisiones
 * de planificación: cuándo vender, cómo cobrar, dónde invertir, qué obras hacer…
 * Cada jugada estima el ahorro con los datos de quien usa la calculadora cuando
 * se puede, y enlaza a la norma o a la Agencia Tributaria.
 */
import { calcular, compararComunidades, P, type Datos, type Resultado } from './irpf';

export type Perfil = 'Asalariado' | 'Inversor' | 'Propietario' | 'Autónomo' | 'Familia' | 'Mayores de 55' | 'General';

export interface Estrategia {
  id: string;
  perfil: Perfil;
  titulo: string;
  texto: string;
  /** Requisitos o riesgos que hay que conocer antes de hacerlo. */
  ojo: string;
  /** Plazo, si lo hay (p. ej. «Antes del 31 de diciembre»). */
  cuando?: string;
  /** Ahorro estimado en euros con los datos introducidos. */
  ahorro?: number;
  /** Si encaja con los datos de quien usa la calculadora (se muestra primero). */
  paraTi: boolean;
  fuente: { titulo: string; url: string };
}

const LIRPF = 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764';
const AEAT_RDL_7_2026 =
  'https://sede.agenciatributaria.gob.es/Sede/todas-noticias/2026/marzo/23/medidas-materia-tributacion.html';

const fmt = (n: number) => `${Math.round(n).toLocaleString('es-ES', { useGrouping: 'always' } as Intl.NumberFormatOptions)} €`;

/** Diferencia de IRPF entre la situación actual y una variante de los datos. */
function ahorroSi(d: Datos, r: Resultado, cambios: Partial<Datos>): number {
  return Math.max(0, r.irpfTotal - calcular({ ...d, ...cambios }).irpfTotal);
}

export function estrategias(d: Datos, r: Resultado): Estrategia[] {
  const lista: Estrategia[] = [];
  const marginal = r.tipoMarginal / 100;
  const marginalAhorro = (r.tipoMarginalAhorro || 19) / 100;
  const pct = `${r.tipoMarginal.toLocaleString('es-ES')} %`;
  const rendAct = Math.max(0, d.actIngresos - d.actGastos);
  const inversor = d.dividendos > 0 || d.intereses > 0 || d.gananciasAhorro !== 0 || d.seguros > 0;
  const cuotaDisponible = Math.max(0, r.cuotaLiquida);

  // ——— Asalariados ———
  {
    const personasSeguro = 1 + (d.tributacion === 'conjunta' ? 1 : 0) + d.hijos;
    const seguro = 500 * personasSeguro;
    const restaurante = 11 * 220;
    const transporte = 1500;
    const tope = d.salario * 0.3;
    const total = Math.min(tope, seguro + restaurante + transporte);
    const ahorro = total * marginal;
    lista.push({
      id: 'flexible',
      perfil: 'Asalariado',
      titulo: 'Cobra parte del sueldo en retribución flexible',
      texto:
        d.salario > 0
          ? `Pide a tu empresa que una parte de tu sueldo bruto se pague en productos exentos: seguro médico (500 € al año por persona; en tu caso ${personasSeguro} ${personasSeguro === 1 ? 'persona' : 'personas'}, ${fmt(seguro)}), tarjeta restaurante (11 € por día laborable, unos ${fmt(restaurante)} al año), abono de transporte público (hasta 1.500 €), guardería de 0 a 3 años y formación ligada a tu puesto. Con tus datos podrías llevar unos ${fmt(total)} a especie exenta y, a tu tipo marginal del ${pct}, ahorrarías alrededor de ${fmt(ahorro)} de IRPF al año. Cobras lo mismo, pero pagas menos.`
          : 'Si trabajas por cuenta ajena, parte del sueldo puede cobrarse en productos exentos de IRPF: seguro médico (500 € al año por persona), tarjeta restaurante (11 € por día laborable), abono de transporte público (hasta 1.500 € al año), guardería de 0 a 3 años y formación ligada al puesto.',
      ojo: 'Tu empresa tiene que ofrecerlo (pregunta a Recursos Humanos). El total en especie no puede pasar del 30 % del salario. Estas cantidades siguen cotizando a la Seguridad Social, así que no bajan tu cotización ni tu futura pensión. Solo compensa si de verdad ibas a gastar ese dinero en esas cosas.',
      ahorro: d.salario > 0 ? ahorro : undefined,
      paraTi: d.salario > 15000,
      fuente: { titulo: 'Ley del IRPF, art. 42 (rentas en especie exentas)', url: `${LIRPF}#a42` },
    });
  }
  {
    const margen = Math.max(0, P.planPensionesEmpresa - d.planEmpresa);
    const prueba = Math.min(margen, 3000);
    const ahorro = prueba > 0 ? ahorroSi(d, r, { planEmpresa: d.planEmpresa + prueba, salario: Math.max(0, d.salario - prueba) }) : 0;
    lista.push({
      id: 'plan-empleo',
      perfil: 'Asalariado',
      titulo: 'Lleva tu bonus o tu subida al plan de pensiones de la empresa',
      texto: `Si tu empresa tiene un plan de pensiones de empleo, puede aportar por ti hasta ${fmt(P.planPensionesEmpresa)} al año además de los 1.500 € de tu plan individual. Si en vez de cobrar ${fmt(prueba || 3000)} de bonus en nómina se aportan a ese plan, esa cantidad no tributa este año${ahorro > 0 ? `: con tus datos, unos ${fmt(ahorro)} menos de IRPF` : ''}. Es de las pocas formas de bajar mucho la base a sueldos altos.`,
      ojo: 'El dinero queda en el plan hasta la jubilación (o hasta que las aportaciones tengan 10 años) y tributa como rendimiento del trabajo cuando lo rescates. Interesa si esperas tener un tipo más bajo de jubilado que ahora.',
      ahorro: ahorro || undefined,
      paraTi: d.salario > 35000,
      fuente: { titulo: 'Ley del IRPF, art. 51 y 52 (límites de reducción por planes)', url: `${LIRPF}#a52` },
    });
  }
  lista.push({
    id: 'irregulares',
    perfil: 'Asalariado',
    titulo: 'Si cobras algo «de golpe», que sea como renta irregular',
    texto:
      'Los ingresos que se generan en más de dos años (un bonus plurianual, un premio de permanencia) o que son notoriamente irregulares (una indemnización por traslado, ciertas compensaciones) solo tributan al 70 %: hay una reducción del 30 % sobre un máximo de 300.000 €. Si negocias un pago extraordinario, pide que se estructure así y que figure como tal en tu certificado de retenciones.',
    ojo: 'No se aplica si ya usaste esta reducción en los cinco años anteriores, salvo excepciones. Las indemnizaciones por despido improcedente están exentas hasta el límite legal (con un máximo de 180.000 €), y lo que supere ese límite puede beneficiarse del 30 % si la antigüedad pasa de dos años.',
    paraTi: d.irregularesTrabajo > 0,
    ahorro: d.irregularesTrabajo > 0 ? Math.min(d.irregularesTrabajo, 300000) * 0.3 * marginal : undefined,
    fuente: { titulo: 'Ley del IRPF, art. 18.2 y 7.e)', url: `${LIRPF}#a18` },
  });
  lista.push({
    id: 'extranjero',
    perfil: 'Asalariado',
    titulo: 'Trabajos en el extranjero: hasta 60.100 € exentos',
    texto:
      'Si tu empresa te desplaza a trabajar fuera de España para una empresa o entidad no residente (o para un establecimiento permanente en el extranjero), la parte del sueldo correspondiente a los días trabajados fuera está exenta hasta 60.100 € al año. Muchos consultores, ingenieros y comerciales que viajan no la aplican.',
    ojo: 'El trabajo tiene que hacerse físicamente fuera y beneficiar a la entidad extranjera, y en ese país debe existir un impuesto similar al IRPF (no vale un paraíso fiscal). Guarda billetes, órdenes de desplazamiento y facturas: Hacienda la revisa a menudo.',
    paraTi: false,
    fuente: { titulo: 'Ley del IRPF, art. 7.p)', url: `${LIRPF}#a7` },
  });

  // ——— Inversores ———
  lista.push({
    id: 'perdidas',
    perfil: 'Inversor',
    titulo: 'Afloja pérdidas antes del 31 de diciembre',
    texto: `Si este año has ganado dinero vendiendo acciones o fondos y tienes otros valores en pérdidas, venderlos antes de fin de año compensa la ganancia y bajas el impuesto del ahorro (entre el 19 % y el 30 %).${d.gananciasAhorro > 0 ? ` Con ${fmt(d.gananciasAhorro)} de ganancias, compensarlas por completo te ahorraría unos ${fmt(d.gananciasAhorro * marginalAhorro)}.` : ''} Las pérdidas que sobren se arrastran cuatro años, y hasta un 25 % puede compensarse con intereses y dividendos.`,
    ojo: 'Regla de los dos meses: si recompras los mismos valores (u homogéneos) dentro de los dos meses anteriores o posteriores a la venta, la pérdida no se computa hasta que los vendas de verdad. En valores no cotizados el plazo es de un año.',
    cuando: 'Antes del 31 de diciembre',
    ahorro: d.gananciasAhorro > 0 ? d.gananciasAhorro * marginalAhorro : undefined,
    paraTi: d.gananciasAhorro > 0,
    fuente: { titulo: 'Ley del IRPF, art. 33.5 y 49', url: `${LIRPF}#a33` },
  });
  lista.push({
    id: 'traspasos',
    perfil: 'Inversor',
    titulo: 'Invierte en fondos de inversión: se pueden cambiar sin pagar',
    texto:
      'Pasar el dinero de un fondo de inversión a otro mediante traspaso no tributa: solo pagas cuando lo sacas definitivamente. Eso te permite reajustar la cartera durante años dejando que el dinero que irías pagando a Hacienda siga generando rentabilidad. Con acciones o ETF, cada venta tributa.',
    ojo: 'Solo vale para fondos de inversión (y SICAV con requisitos) comercializados en España con al menos 500 partícipes. Los ETF cotizados no se benefician. Tributarás al final, pero más tarde y, si rescatas poco a poco, con tipos más bajos.',
    paraTi: inversor,
    fuente: { titulo: 'Ley del IRPF, art. 94 (traspasos entre IIC)', url: `${LIRPF}#a94` },
  });
  lista.push({
    id: 'startups',
    perfil: 'Inversor',
    titulo: 'Invierte en empresas de nueva creación: 50 % de deducción',
    texto: `Si suscribes acciones o participaciones de una empresa de nueva o reciente creación (startups y sociedades de menos de 5 años, o 7 en sectores como biotecnología), puedes deducirte el 50 % de lo invertido, con una base máxima de 100.000 € al año: hasta 50.000 € menos de impuesto. Además, algunas comunidades añaden su propia deducción.${cuotaDisponible > 0 ? ` La deducción no puede superar tu cuota, que con tus datos ronda ${fmt(cuotaDisponible)}.` : ''}`,
    ojo: 'Hay que mantener la inversión entre 3 y 12 años, no tener con la familia más del 40 % del capital y la empresa debe cumplir requisitos (fondos propios inferiores a 400.000 € al invertir, actividad real…). Es una inversión de alto riesgo: no inviertas solo por la deducción.',
    paraTi: r.baseLiquidableGeneral > 60000,
    fuente: { titulo: 'Ley del IRPF, art. 68.1 (deducción por inversión en ENRC)', url: `${LIRPF}#a68` },
  });

  // ——— Propietarios y vivienda ———
  lista.push({
    id: 'eficiencia',
    perfil: 'Propietario',
    titulo: 'Obras de eficiencia energética: deduce entre el 20 % y el 60 %',
    texto:
      'Ventanas, aislamiento, aerotermia o placas solares en tu vivienda dan derecho a deducir el 20 % (si reducen un 7 % la demanda de calefacción y refrigeración, hasta 5.000 €), el 40 % (si reducen un 30 % el consumo de energía o llegas a la letra A o B, hasta 7.500 €) o el 60 % en obras de todo el edificio (hasta 5.000 € al año y 15.000 € en total). Ejemplo: 7.500 € de obra que llega a la letra B son 3.000 € menos de IRPF.',
    ojo: 'Necesitas certificados de eficiencia energética antes y después de la obra, pagar con tarjeta o transferencia (nunca en efectivo) y que la obra esté terminada en plazo: 31 de diciembre de 2026 para las de vivienda y de 2027 para las del edificio, según la prórroga del Real Decreto-ley 7/2026.',
    cuando: 'Hasta el 31 de diciembre de 2026',
    paraTi: false,
    fuente: { titulo: 'Agencia Tributaria: medidas del Real Decreto-ley 7/2026', url: AEAT_RDL_7_2026 },
  });
  lista.push({
    id: 'electrico',
    perfil: 'General',
    titulo: 'Coche eléctrico o punto de recarga: 15 % de deducción',
    texto:
      'Comprar un coche eléctrico nuevo (o de pila de combustible) da derecho a deducir el 15 % de su precio, con una base máxima de 20.000 €: hasta 3.000 € menos de IRPF. Instalar un punto de recarga en casa te permite deducir otro 15 %, con una base de hasta 4.000 € (600 €).',
    ojo: 'El coche debe estar matriculado y pagado dentro del plazo de la prórroga (31 de diciembre de 2026). No cuenta la parte pagada con ayudas públicas como el Plan MOVES, y el coche no puede estar afecto a una actividad económica.',
    cuando: 'Hasta el 31 de diciembre de 2026',
    paraTi: false,
    fuente: { titulo: 'Agencia Tributaria: medidas del Real Decreto-ley 7/2026', url: AEAT_RDL_7_2026 },
  });
  if (d.viviendaAntes2013 > 0 && d.viviendaAntes2013 < 9040) {
    const extra = 9040 - d.viviendaAntes2013;
    lista.push({
      id: 'hipoteca-2013',
      perfil: 'Propietario',
      titulo: 'Exprime la deducción de tu hipoteca anterior a 2013',
      texto: `Si compraste tu vivienda habitual antes de 2013, puedes deducir el 15 % de hasta 9.040 € pagados al año (capital, intereses y seguros vinculados). Este año has pagado ${fmt(d.viviendaAntes2013)}: amortizando ${fmt(extra)} más antes de fin de año, te deducirías ${fmt(extra * 0.15)} extra.`,
      ojo: 'Solo compensa si te sobra liquidez y la amortización anticipada tiene sentido por sí misma. Revisa la comisión de tu banco por amortizar.',
      cuando: 'Antes del 31 de diciembre',
      ahorro: extra * 0.15,
      paraTi: true,
      fuente: { titulo: 'Ley del IRPF, disposición transitoria 18.ª', url: `${LIRPF}#dtdecimoctava` },
    });
  }
  lista.push({
    id: 'alquiler-habitual',
    perfil: 'Propietario',
    titulo: 'Si alquilas un piso, hazlo como vivienda habitual',
    texto:
      'Alquilar un piso como vivienda habitual del inquilino da una reducción del 50 % del rendimiento neto, que llega al 60 %, 70 % o 90 % según el caso (rehabilitación reciente, jóvenes en zona tensionada, rebaja de renta). Un alquiler de temporada o turístico no tiene ninguna reducción. Con 6.000 € de beneficio neto, pasar del 0 % al 50 % ahorra a un tipo del 30 % unos 900 € al año.',
    ojo: 'Tiene que ser realmente la vivienda habitual del inquilino (con contrato de vivienda, no de temporada). Desde 2024, en contratos nuevos la reducción general es del 50 %, y las mayores dependen de requisitos que conviene acreditar.',
    paraTi: d.alquilerIngresos > 0 && d.alquilerReduccion === 0,
    ahorro: d.alquilerIngresos > 0 && d.alquilerReduccion === 0 ? ahorroSi(d, r, { alquilerReduccion: 50 }) || undefined : undefined,
    fuente: { titulo: 'Ley del IRPF, art. 23.2', url: `${LIRPF}#a23` },
  });

  // ——— Autónomos ———
  const margenPpes = Math.max(0, Math.min(5750, rendAct * 0.3) - Math.min(d.planPropio, P.planPensionesIndividual));
  lista.push({
    id: 'autonomo-ppes',
    perfil: 'Autónomo',
    titulo: 'Autónomo: plan de pensiones simplificado hasta 5.750 €',
    texto: `Además de los 1.500 € del plan individual, los autónomos pueden aportar 4.250 € más a un plan de pensiones de empleo simplificado (PPES), en total 5.750 € al año que se restan de la base.${margenPpes > 0 ? ` Con tus datos, aportar el máximo te ahorraría unos ${fmt(margenPpes * marginal)}.` : ''}`,
    ojo: 'Nunca más del 30 % de tus rendimientos netos del trabajo y de actividades. El dinero queda bloqueado y tributa al rescatarlo.',
    ahorro: margenPpes > 0 ? margenPpes * marginal : undefined,
    paraTi: d.actIngresos > 0,
    fuente: { titulo: 'Ley del IRPF, art. 52', url: `${LIRPF}#a52` },
  });
  lista.push({
    id: 'autonomo-gastos',
    perfil: 'Autónomo',
    titulo: 'Autónomo: adelanta gastos e inversiones a diciembre',
    texto:
      'Si este año has facturado más de lo normal, adelantar compras que ibas a hacer igualmente (ordenador, formación, software, reparaciones) baja el beneficio de este ejercicio. En estimación directa simplificada, además, Hacienda te deja restar un 5 % del rendimiento como gastos de difícil justificación (máximo 2.000 €), sin facturas. Si trabajas en casa, deduce el 30 % de los suministros en proporción a los metros que usas.',
    ojo: 'Los gastos tienen que estar vinculados a la actividad, con factura a tu nombre y registrados. Los equipos de más de 300 € se amortizan en varios años, salvo que cumplas los requisitos de libertad de amortización.',
    cuando: 'Antes del 31 de diciembre',
    paraTi: d.actIngresos > 0,
    fuente: { titulo: 'Ley del IRPF, art. 28 a 30 (rendimientos de actividades)', url: `${LIRPF}#a30` },
  });
  lista.push({
    id: 'sociedad',
    perfil: 'Autónomo',
    titulo: 'Con beneficios altos, estudia montar una sociedad',
    texto: `El IRPF de un autónomo puede llegar al 45-54 % según la comunidad, mientras que una sociedad limitada pequeña paga el Impuesto sobre Sociedades a un tipo fijo de entre el 20 % y el 25 %. A partir de unos 50.000-60.000 € de beneficio al año, facturar a través de una sociedad y cobrar de ella solo lo que necesitas suele salir más barato.${rendAct > 50000 ? ` Con ${fmt(rendAct)} de rendimiento, merece la pena hacer los números con un asesor.` : ''}`,
    ojo: 'Una sociedad tiene costes (constitución, contabilidad, depósito de cuentas) y el dinero que saques como dividendo vuelve a tributar. Hacienda vigila las «sociedades instrumentales» de profesionales: lo que te pague la sociedad debe ser a precio de mercado.',
    paraTi: rendAct > 50000,
    fuente: { titulo: 'Agencia Tributaria: Impuesto sobre Sociedades', url: 'https://sede.agenciatributaria.gob.es/Sede/impuesto-sobre-sociedades.html' },
  });

  // ——— Familia ———
  lista.push({
    id: 'conyuge-plan',
    perfil: 'Familia',
    titulo: 'Aporta al plan de pensiones de tu pareja',
    texto:
      'Si tu cónyuge gana menos de 8.000 € al año del trabajo o de actividades, puedes aportar hasta 1.000 € al año a su plan de pensiones y restarlos de tu base. El dinero ahorra para la jubilación de tu pareja y baja tu IRPF.',
    ojo: 'Solo entre cónyuges (no parejas de hecho no casadas). El dinero pasa a ser de tu pareja.',
    ahorro: d.salario + d.actIngresos > 15000 ? 1000 * marginal : undefined,
    paraTi: d.tributacion === 'conjunta',
    fuente: { titulo: 'Ley del IRPF, art. 51.7', url: `${LIRPF}#a51` },
  });
  lista.push({
    id: 'ascendientes',
    perfil: 'Familia',
    titulo: 'Si tus padres viven contigo, cuéntalos',
    texto:
      'Cada padre o madre mayor de 65 años que conviva contigo al menos la mitad del año (o esté en una residencia) y tenga rentas de menos de 8.000 € añade 1.150 € a tu mínimo familiar, y 1.400 € más si tiene más de 75. Con discapacidad, aún más. Muchas comunidades suman deducciones propias por cuidar a mayores.',
    ojo: 'Si conviven con varios hijos, el mínimo se reparte a partes iguales entre ellos. Tu padre o madre no puede presentar declaración con rentas de más de 1.800 €.',
    paraTi: d.ascendientes65 === 0 && d.edad >= 35,
    fuente: { titulo: 'Ley del IRPF, art. 59', url: `${LIRPF}#a59` },
  });
  lista.push({
    id: 'patrimonio-protegido',
    perfil: 'Familia',
    titulo: 'Familiar con discapacidad: patrimonio protegido',
    texto:
      'Las aportaciones a un patrimonio protegido de un familiar con discapacidad (hijo, hermano, padre…) reducen tu base hasta 10.000 € al año (24.250 € entre todos los aportantes). Es una forma de ahorrar para su futuro pagando menos impuestos.',
    ojo: 'El patrimonio protegido tiene reglas de disposición: si se saca dinero antes de 4 años, se pierde la ventaja.',
    paraTi: d.hijosDiscapacidad > 0 || d.ascendientesDiscapacidad > 0,
    ahorro: d.hijosDiscapacidad > 0 || d.ascendientesDiscapacidad > 0 ? ahorroSi(d, r, { patrimonioProtegido: Math.max(d.patrimonioProtegido, 3000) }) || undefined : undefined,
    fuente: { titulo: 'Ley del IRPF, art. 54', url: `${LIRPF}#a54` },
  });

  // ——— Mayores de 55 ———
  lista.push({
    id: 'rescate-plan',
    perfil: 'Mayores de 55',
    titulo: 'Rescata el plan de pensiones con cabeza',
    texto:
      'Al jubilarte, rescatar todo el plan de golpe puede subirte varios tramos. Es mejor sacarlo poco a poco a lo largo de varios años (como renta o en capitales parciales), sobre todo en los primeros años de jubilación si cobras menos. Además, lo aportado antes de 2007 tiene una reducción del 40 % si lo cobras en forma de capital en el año de la jubilación o en los dos siguientes.',
    ojo: 'La reducción del 40 % solo se aplica una vez y sobre las aportaciones anteriores a 2007. Pide a tu gestora el desglose antes de decidir.',
    paraTi: d.edad >= 55,
    fuente: { titulo: 'Ley del IRPF, disposición transitoria 12.ª', url: `${LIRPF}#dtduodecima` },
  });
  lista.push({
    id: 'mayores-65',
    perfil: 'Mayores de 55',
    titulo: 'Con 65 años o más, vender tu casa no tributa',
    texto:
      'Si tienes 65 años o más y vendes tu vivienda habitual, la ganancia está exenta por completo. Y si vendes cualquier otro bien (un piso, acciones) y reinviertes lo obtenido en una renta vitalicia asegurada en seis meses, la ganancia también queda exenta hasta 240.000 €. Si te queda poco para cumplirlos, esperar a cumplirlos puede ahorrarte miles de euros.',
    ojo: 'La vivienda tiene que ser tu residencia habitual (al menos tres años, o haberlo sido hasta hace dos). La renta vitalicia debe contratarse en seis meses y cumplir requisitos.',
    paraTi: d.edad >= 60,
    fuente: { titulo: 'Ley del IRPF, art. 33.4 y 38.3', url: `${LIRPF}#a38` },
  });

  // ——— Para todos ———
  if (r.comunidad && !r.comunidad.foral) {
    const ranking = compararComunidades(d);
    // Ceuta y Melilla tienen una bonificación especial: se compara con la comunidad más barata.
    const mejor = ranking.find((x) => !x.comunidad.ceutaMelilla);
    const diferencia = r.irpfTotal - (mejor?.irpf ?? r.irpfTotal);
    lista.push({
      id: 'residencia',
      perfil: 'General',
      titulo: 'Dónde vives también cuenta',
      texto:
        diferencia > 50 && mejor
          ? `Con los mismos ingresos, en ${mejor.comunidad.nombre} pagarías unos ${fmt(diferencia)} menos al año que en ${r.comunidad.nombre}. Si teletrabajas o vas a mudarte de todos modos, tenlo en cuenta al elegir. Mira la tabla «¿Y si vivieras en otra comunidad?» de esta misma página.`
          : 'Con tus datos, tu comunidad ya está entre las que menos IRPF cobran. Mira la tabla «¿Y si vivieras en otra comunidad?» de esta misma página.',
      ojo: 'Tienes que vivir de verdad allí: tributas en la comunidad donde pasas más días del año. Empadronarte sin vivir no vale, y Hacienda puede ignorar un cambio de residencia hecho solo para pagar menos si vuelves en pocos años.',
      ahorro: diferencia > 50 ? diferencia : undefined,
      paraTi: diferencia > 300,
      fuente: { titulo: 'Ley 22/2009, art. 28 (residencia habitual por comunidad)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2009-20375#a28' },
    });
  }
  lista.push({
    id: 'mito-tramo',
    perfil: 'General',
    titulo: 'Mito: «si gano más, salto de tramo y cobro menos»',
    texto:
      'Es falso. El IRPF es progresivo por tramos: cada tipo solo se aplica a la parte del sueldo que cae dentro de ese tramo. Si una subida te mete en el siguiente, solo los euros que lo superan pagan el tipo más alto. Nunca rechaces una subida por miedo a «saltar de tramo».',
    ojo: 'Sí puede pasar que pierdas alguna ayuda o deducción con límite de renta (becas, deducción por alquiler de tu comunidad, deducción del SMI), así que revisa esos umbrales.',
    paraTi: d.salario > 0,
    fuente: { titulo: 'Ley del IRPF, art. 63 (escala general)', url: `${LIRPF}#a63` },
  });

  // Primero las que encajan contigo y, dentro de ellas, las de más ahorro.
  return lista.sort((a, b) => Number(b.paraTi) - Number(a.paraTi) || (b.ahorro ?? 0) - (a.ahorro ?? 0));
}
