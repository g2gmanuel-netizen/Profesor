/**
 * Rúbrica del Titulador (sección 6 del prompt). Puntúa un titular de 0 a 10.
 * Es determinista y testeable: el agente Titulador la usa para elegir el mejor
 * de entre sus candidatos. "Fidelidad" es eliminatoria y la marca el propio agente.
 */

export interface EntradaRubrica {
  titular: string;
  /** Palabras/entidades clave que el titular debería contener (nombre propio, organismo, tema). */
  entidades: string[];
  /** ¿El cuerpo cumple al 100 % lo que promete el titular? Si no, puntuación 0. */
  fiel: boolean;
}

export interface ResultadoRubrica {
  total: number;
  detalle: Record<string, number>;
}

const PALABRAS_SENSACIONALISTAS = [
  'no creerás',
  'alucinarás',
  'esto cambiará tu vida',
  'increíble',
  'brutal',
  'escándalo',
  'lo que nadie te cuenta',
];

export function puntuarTitular(e: EntradaRubrica): ResultadoRubrica {
  const detalle: Record<string, number> = {};
  if (!e.fiel) {
    return { total: 0, detalle: { fidelidad: 0 } };
  }
  detalle.fidelidad = 2;

  const t = e.titular;
  const tl = t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  // Entidad al principio (en las primeras 5 palabras).
  const primeras = tl.split(/\s+/).slice(0, 5).join(' ');
  const entidadAlPrincipio = e.entidades.some((x) => {
    const xn = x
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
    return primeras.includes(xn);
  });
  detalle.entidadAlPrincipio = entidadAlPrincipio ? 2 : e.entidades.some((x) => tl.includes(x.toLowerCase())) ? 1 : 0;

  // Concreción óptima: contiene un dato concreto (cifra, %, €, fecha) pero no lo cuenta todo.
  const tieneDato = /\d|%|€|euros?|por ciento/.test(tl);
  const muyLargo = t.length > 95;
  detalle.concrecion = tieneDato ? (muyLargo ? 1 : 2) : 0.5;

  // Utilidad explícita.
  const utilidad = /(tu|te|cu[aá]nto|c[oó]mo|qu[eé] cambia|requisitos|plazo|pagar[aá]s|ahorr)/.test(tl);
  detalle.utilidad = utilidad ? 2 : 0;

  // Longitud 55–90 caracteres.
  const len = t.length;
  detalle.longitud = len >= 55 && len <= 90 ? 1 : len >= 45 && len <= 100 ? 0.5 : 0;

  // Tono: penaliza mayúsculas gritonas y clichés.
  const gritos = /[A-ZÁÉÍÓÚÑ]{5,}/.test(t);
  const cliche = PALABRAS_SENSACIONALISTAS.some((p) => tl.includes(p));
  detalle.tono = gritos || cliche ? 0 : 1;

  const total = Object.values(detalle).reduce((a, b) => a + b, 0);
  return { total: Math.round(total * 10) / 10, detalle };
}

export function elegirMejorTitular(
  candidatos: string[],
  entidades: string[],
  fiel: boolean,
): { elegido: string; puntuaciones: { titular: string; total: number }[] } {
  const puntuaciones = candidatos.map((titular) => ({
    titular,
    total: puntuarTitular({ titular, entidades, fiel }).total,
  }));
  // Empates: el más claro = el más corto.
  const ordenados = [...puntuaciones].sort(
    (a, b) => b.total - a.total || a.titular.length - b.titular.length,
  );
  return { elegido: ordenados[0]?.titular ?? candidatos[0] ?? '', puntuaciones };
}
