/**
 * Red de seguridad editorial: el lector nunca debe leer frases sobre nuestras
 * fuentes internas ("la ficha", "el JSON", "el resumen") ni sobre datos que
 * faltan ("no consta", "no disponible", "lo que todavía no sabemos"). Si un dato
 * no lo tenemos, el texto simplemente no lo menciona.
 *
 * Los prompts ya lo prohíben; este filtro elimina lo que se escape antes de publicar.
 */

const PATRONES: RegExp[] = [
  /\bjson\b/i,
  /\bla ficha\b/i,
  /\bficha de (hechos|datos)\b/i,
  /\bno consta(n)?\b/i,
  /\b(dato|datos|cifra|cifras|informaci[oó]n)\s+no\s+disponibles?\b/i,
  /\(\s*no disponible\s*\)/i,
  /\b(el|la|este|esta|nuestra|nuestro)\s+(resumen|fuente|informaci[oó]n|nota|noticia|ficha)\s+(disponible\s+|consultad[ao]\s+|de partida\s+|original\s+|que manejamos\s+|al que hemos tenido acceso\s+)?(no\s+(detalla|especifica|indica|incluye|recoge|aporta|precisa|aclara|menciona|explica|ofrece|desglosa|concreta|establece)|solo\s+(dice|indica|habla|recoge|da|confirma))\b/i,
  /\bno (tenemos|disponemos de) (datos|cifras|informaci[oó]n|el dato|la cifra|detalles)\b/i,
  /\bno hemos podido (verificar|confirmar|comprobar|contrastar)\b/i,
  /\blo que (todav[ií]a |a[uú]n )?no (sabemos|se sabe|est[aá] claro)\b/i,
  /\b(seamos|ser|somos) honestos( contigo)?\b/i,
  /\bun apunte de transparencia\b/i,
  /\binformaci[oó]n (de partida|que manejamos|al alcance|a la que hemos tenido acceso)\b/i,
  /\bagregador de noticias\b/i,
  /\bno aparece en (el|la) (resumen|fuente|ficha|informaci[oó]n)\b/i,
  /\bel resumen (al que|disponible|de la noticia|no|omite)\b/i,
  /\bresumen de (una|la) fuente\b/i,
  /\b(con|en|seg[uú]n) la fuente (disponible|consultada)\b/i,
  /\brespaldad[ao]s? por la fuente\b/i,
  /\bno (ha sido|es) posible (verificar|confirmar|contrastar)\b/i,
  /\b(advertencia|apunte|resumen) (de )?honest/i,
  /\bser transparente\b/i,
  /\bel dato del que disponemos\b/i,
  /\bde la que partimos\b|\bde partida no\b/i,
  /\bno figura (en|el|la)\b/i,
  /\bfalta por confirmar\b/i,
  /\bno est[aá] verificad[ao] en la fuente\b/i,
  /\bno vamos a (especular|inventar)\b/i,
  /\bpreferimos no (d[aá]rtel|inventar)/i,
  /\btambi[eé]n avisa de lo que no sabe\b/i,
];

const SECCION_CARENCIAS =
  /(lo que (todav[ií]a |a[uú]n )?no (sabemos|se sabe)|lo que sabemos y lo que no|dudas (sin resolver|que quedan|abiertas|pendientes)|preguntas sin respuesta|lo que falta por saber|limitaciones de (la|esta) informaci[oó]n)/i;

/** Devuelve los fragmentos problemáticos encontrados (vacío si está limpio). */
export function detectarCarencias(texto: string): string[] {
  const hallados: string[] = [];
  for (const p of PATRONES) {
    const m = texto.match(p);
    if (m) hallados.push(m[0]);
  }
  return hallados;
}

const tieneCarencia = (s: string): boolean => PATRONES.some((p) => p.test(s));

/** Quita las frases (y paréntesis) que hablan de carencias, conservando el resto del párrafo. */
function limpiarParrafo(texto: string): string {
  // Paréntesis con carencias: "(no tenemos datos concretos en el JSON, pero…)".
  let t = texto.replace(/\s*\([^()]*\)/g, (m) => (tieneCarencia(m) ? '' : m));
  if (!tieneCarencia(t)) return t;
  // Por frases.
  // Fin de frase = . ! ? (más comillas o paréntesis de cierre) seguido de espacio.
  // Así no se corta en cifras como "1.700" ni en "EE. UU." a mitad de palabra.
  const frases = t.split(/(?<=[.!?]["»”)*]*)\s+(?=[A-ZÁÉÍÓÚÑ¿¡«"*(])/);
  t = frases.filter((f) => !tieneCarencia(f)).join(' ').trim();
  return t;
}

/**
 * Limpia un cuerpo en Markdown: elimina secciones enteras del tipo "Lo que todavía
 * no sabemos", viñetas y filas de tabla con carencias, y las frases sueltas que
 * las mencionan. Deja los subtítulos que se queden sin contenido fuera.
 */
export function limpiarCarencias(markdown: string): string {
  const lineas = markdown.split('\n');
  const salida: string[] = [];
  let saltarHastaNivel = 0; // nivel de subtítulo de una sección de carencias que estamos omitiendo

  for (const linea of lineas) {
    const h = linea.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const nivel = h[1]!.length;
      if (saltarHastaNivel && nivel > saltarHastaNivel) continue;
      saltarHastaNivel = 0;
      if (SECCION_CARENCIAS.test(h[2]!)) {
        saltarHastaNivel = nivel;
        continue;
      }
      salida.push(linea);
      continue;
    }
    if (saltarHastaNivel) continue;

    // Filas de tabla: fuera las que dicen "no disponible" / "n/d".
    if (/^\s*\|/.test(linea)) {
      if (/\|\s*(no disponible|n\/d|nd|sin datos)\s*\|/i.test(linea) || tieneCarencia(linea)) continue;
      salida.push(linea);
      continue;
    }

    // Viñetas y listas numeradas: si mencionan carencias, se quita la viñeta entera.
    if (/^\s*([-*+]|\d+[.)])\s+/.test(linea)) {
      if (tieneCarencia(linea)) continue;
      salida.push(linea);
      continue;
    }

    if (linea.trim() === '') {
      salida.push(linea);
      continue;
    }
    const limpio = limpiarParrafo(linea);
    if (limpio.trim()) salida.push(limpio);
  }

  // Quitar subtítulos que se hayan quedado sin contenido debajo.
  const final: string[] = [];
  for (let i = 0; i < salida.length; i++) {
    const h = salida[i]!.match(/^(#{1,6})\s+/);
    if (h) {
      let j = i + 1;
      while (j < salida.length && salida[j]!.trim() === '') j++;
      const sig = salida[j];
      const sigH = sig?.match(/^(#{1,6})\s+/);
      if (sig === undefined || (sigH && sigH[1]!.length <= h[1]!.length)) continue;
    }
    final.push(salida[i]!);
  }

  return final
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Quita de una lista (p. ej. "Claves rápidas") los puntos que hablan de carencias. */
export function limpiarLista(items: string[]): string[] {
  return items.filter((i) => !tieneCarencia(i));
}
