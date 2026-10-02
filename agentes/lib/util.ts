export function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export function contarPalabras(texto: string): number {
  return texto.split(/\s+/).filter(Boolean).length;
}

const VACIAS = new Set([
  'el','la','los','las','un','una','unos','unas','de','del','a','al','y','o','u','que','en','con',
  'por','para','su','sus','se','lo','es','son','como','más','mas','ya','le','les','sobre','entre',
  'tu','tus','the','of','and',
]);

export function tokens(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !VACIAS.has(t));
}

/** Similitud de Jaccard entre dos textos por conjuntos de tokens (0..1). */
export function similitud(a: string, b: string): number {
  const sa = new Set(tokens(a));
  const sb = new Set(tokens(b));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Longitud de la secuencia de palabras en común más larga (para detectar copia literal). */
export function maxRachaComun(fuente: string, texto: string): number {
  const pf = tokens(fuente);
  const pt = tokens(texto);
  const setFuente = new Set<string>();
  for (let i = 0; i < pf.length - 2; i++) setFuente.add(`${pf[i]} ${pf[i + 1]} ${pf[i + 2]}`);
  let max = 0;
  let racha = 0;
  for (let i = 0; i < pt.length - 2; i++) {
    if (setFuente.has(`${pt[i]} ${pt[i + 1]} ${pt[i + 2]}`)) {
      racha++;
      max = Math.max(max, racha + 2);
    } else {
      racha = 0;
    }
  }
  return max;
}
