/**
 * Generador de imágenes de portada propias (SVG, 1200×675). Sin fotos de terceros:
 * portada tipográfica con el color de la sección, para que cada artículo tenga una
 * imagen atractiva y coherente con la marca.
 */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function repartirLineas(titulo: string, maxChars = 22, maxLineas = 4): string[] {
  const palabras = titulo.split(/\s+/);
  const lineas: string[] = [];
  let actual = '';
  for (const p of palabras) {
    if ((actual + ' ' + p).trim().length > maxChars && actual) {
      lineas.push(actual.trim());
      actual = p;
    } else {
      actual = (actual + ' ' + p).trim();
    }
  }
  if (actual) lineas.push(actual);
  return lineas.slice(0, maxLineas);
}

export function portadaSVG(
  titulo: string,
  seccion: string,
  colores: [string, string],
): string {
  const [c1, c2] = colores;
  const lineas = repartirLineas(titulo);
  // Tamaño de letra según número de líneas, para que llene bien.
  const fontSize = lineas.length <= 2 ? 72 : lineas.length === 3 ? 62 : 54;
  const lineHeight = fontSize + 12;
  const alturaTexto = lineas.length * lineHeight;
  const yInicio = 300 - alturaTexto / 2 + fontSize;
  const tspans = lineas
    .map((l, i) => `<tspan x="80" y="${(yInicio + i * lineHeight).toFixed(0)}">${esc(l)}</tspan>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="${esc(titulo)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#g)"/>
  <circle cx="1050" cy="150" r="320" fill="#ffffff" opacity="0.06"/>
  <circle cx="1120" cy="560" r="180" fill="#ffffff" opacity="0.05"/>
  <rect x="80" y="86" width="64" height="8" rx="4" fill="#ffffff" opacity="0.9"/>
  <text x="160" y="98" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="3" fill="#ffffff" opacity="0.95">${esc(seccion.toUpperCase())}</text>
  <text font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="#ffffff">${tspans}</text>
  <text x="80" y="620" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="800" fill="#ffffff" opacity="0.95">Bolsillo Diario</text>
</svg>`;
}

export function graficoBarrasSVG(
  titulo: string,
  seccion: string,
  colores: [string, string],
  datos: { etiqueta: string; valor: number; unidad?: string }[],
  fuente: string,
): string {
  const [c1] = colores;
  const d = datos.slice(0, 6);
  const maxValor = Math.max(...d.map((x) => Math.abs(x.valor)), 1);
  const anchoBarra = 900 / d.length;
  const barras = d
    .map((x, i) => {
      const alto = (Math.abs(x.valor) / maxValor) * 320;
      const px = 150 + i * anchoBarra + anchoBarra * 0.15;
      const py = 500 - alto;
      const w = anchoBarra * 0.7;
      return `
      <rect x="${px.toFixed(0)}" y="${py.toFixed(0)}" width="${w.toFixed(0)}" height="${alto.toFixed(0)}" fill="${c1}" rx="4"/>
      <text x="${(px + w / 2).toFixed(0)}" y="${(py - 12).toFixed(0)}" font-size="26" font-weight="700" fill="#17211b" text-anchor="middle">${esc(String(x.valor))}${esc(x.unidad ?? '')}</text>
      <text x="${(px + w / 2).toFixed(0)}" y="525" font-size="18" fill="#55606e" text-anchor="middle">${esc((x.etiqueta ?? '').slice(0, 16))}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img" aria-label="${esc(titulo)}">
  <rect width="1200" height="675" fill="#ffffff"/>
  <rect x="0" y="0" width="1200" height="12" fill="${c1}"/>
  <text x="60" y="90" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="2" fill="${c1}">${esc(seccion.toUpperCase())}</text>
  <text x="60" y="140" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="800" fill="#17211b">${esc(titulo.slice(0, 46))}</text>
  <line x1="150" y1="500" x2="1060" y2="500" stroke="#e2e6ea" stroke-width="2"/>
  ${barras}
  <text x="60" y="640" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#55606e">Fuente: ${esc(fuente)} · Bolsillo Diario</text>
</svg>`;
}
