import type { ContextoEjecucion } from '../lib/contexto';
import { leerPrompt } from '../lib/contexto';
import {
  InformeVerificacionSchema,
  type FichaHechos,
  type InformeVerificacion,
} from '../lib/esquemas';

/**
 * Extrae las cifras SIGNIFICATIVAS de un texto: porcentajes, importes en euros y
 * números "grandes" (con separador de millar/decimal o de 4+ dígitos). Ignora a
 * propósito los marcadores de lista y ordinales ("1.", "2.", "3."), los dígitos
 * sueltos (1-3 cifras sin unidad) y los años: no son afirmaciones estadísticas y
 * provocaban rechazos en falso de artículos correctos.
 */
export function extraerCifras(texto: string): string[] {
  const salida: string[] = [];
  const re = /\d[\d.,]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    const bruto = m[0];
    const resto = texto.slice(m.index + bruto.length);
    const unidad = resto.match(/^\s?(%|€|por\s?ciento|euros?)/i);
    const nucleo = bruto.replace(/[.,]+$/, ''); // quita puntuación de cierre (fin de frase o lista)
    const digitos = nucleo.replace(/[^\d]/g, '');
    if (digitos.length === 0) continue;
    const tieneSeparador = /[.,]/.test(nucleo);
    if (!unidad) {
      if (digitos.length <= 3 && !tieneSeparador) continue; // lista/ordinal/número pequeño
      if (!tieneSeparador && /^(1[89]|20)\d{2}$/.test(digitos)) continue; // años
    }
    const unidadNorm = unidad ? unidad[1].replace(/\s+/g, '').toLowerCase() : '';
    salida.push((nucleo + unidadNorm).toLowerCase());
  }
  return Array.from(new Set(salida)).filter((s) => s.length > 0);
}

/**
 * Guardia determinista: toda cifra significativa del cuerpo debe aparecer en la
 * ficha de hechos. Es el muro contra datos inventados y se ejecuta SIEMPRE, también
 * con API. Compara tanto el número con separadores como solo sus dígitos, para que
 * "1.700" y "1700" cuenten como la misma cifra.
 */
export function cifrasSinRespaldo(cuerpo: string, ficha: FichaHechos): string[] {
  const textoFichaBruto = [
    ...ficha.hechos.map((h) => `${h.afirmacion} ${h.cita ?? ''}`),
    ...ficha.contexto,
    ...ficha.datosNumericos.map((d) => `${d.valor}${d.unidad ?? ''} ${d.etiqueta}`),
  ]
    .join(' ')
    .toLowerCase();
  const textoFicha = textoFichaBruto.replace(/\s+/g, '');
  const fichaDigitos = textoFichaBruto.replace(/[^\d]/g, '');

  const sinRespaldo: string[] = [];
  for (const cifra of extraerCifras(cuerpo)) {
    const soloNumero = cifra.replace(/[^\d.,]/g, '');
    const soloDigitos = soloNumero.replace(/[^\d]/g, '');
    if (soloDigitos.length <= 1) continue; // ignora dígitos sueltos triviales
    const enFicha =
      textoFicha.includes(soloNumero) ||
      (soloDigitos.length >= 4 && fichaDigitos.includes(soloDigitos));
    if (!enFicha) sinRespaldo.push(cifra);
  }
  return Array.from(new Set(sinRespaldo));
}

/** Agente 7 — Verificador. */
export async function verificador(
  cuerpo: string,
  ficha: FichaHechos,
  ctx: ContextoEjecucion,
): Promise<InformeVerificacion> {
  ctx.logger.paso('verificador', `Verificando «${ficha.titulo}»`);

  const problemasCifras = cifrasSinRespaldo(cuerpo, ficha).map(
    (c) => `Cifra sin respaldo en la ficha de hechos: "${c}"`,
  );

  if (ctx.sinApi) {
    return InformeVerificacionSchema.parse({
      aprobado: problemasCifras.length === 0,
      problemas: problemasCifras,
    });
  }

  const user = [
    'Ficha de hechos (única verdad permitida):',
    JSON.stringify(ficha, null, 2),
    '',
    'Cuerpo del artículo a verificar:',
    cuerpo,
  ].join('\n');

  const res = await ctx.llm.generarJSON({
    agente: 'verificador',
    modelo: ctx.config.modeloRedaccion,
    system: leerPrompt('7-verificador'),
    user,
    schema: InformeVerificacionSchema,
    maxTokens: 6000,
    articulo: ficha.temaId,
  });

  // Combinamos: el guardia de cifras manda. Si hay cifras sin respaldo, no se aprueba.
  return {
    aprobado: res.aprobado && problemasCifras.length === 0,
    problemas: [...res.problemas, ...problemasCifras],
    cuerpoCorregido: res.cuerpoCorregido,
  };
}
