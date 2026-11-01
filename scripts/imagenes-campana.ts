/**
 * Imágenes fijas de la campaña en redes (public/redes/campana/): la foto de perfil con el
 * logo del cerebro y los anuncios de la calculadora de IRPF (cuadrado y vertical).
 *
 * Uso: npx tsx scripts/imagenes-campana.ts
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { calcular, DATOS_VACIOS } from '../src/lib/irpf';

const DIR = resolve(process.cwd(), 'public/redes/campana');
const SANS = "'DejaVu Sans', Arial, sans-serif";
const SERIF = "'DejaVu Serif', Georgia, serif";
const VERDE = '#0a5234';
const PAPEL = '#faf7f1';
const miles = (n: number) => Math.round(n).toLocaleString('es-ES', { useGrouping: 'always' } as unknown as Intl.NumberFormatOptions);

/** El cerebro del favicon, centrado y a sangre: TikTok e Instagram lo recortan en círculo. */
function fotoPerfil(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="1080" height="1080">
  <rect width="64" height="64" fill="${VERDE}"/>
  <g transform="translate(32 32.5) scale(1.12)" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 -17 a7 7 0 0 0 -13 2 a7 7 0 0 0 -6 9 a7.5 7.5 0 0 0 1.4 9.5 a7 7 0 0 0 2.6 8 a7 7 0 0 0 7 4 a6.5 6.5 0 0 0 8 1 Z"/>
    <path d="M0 -17 a7 7 0 0 1 13 2 a7 7 0 0 1 6 9 a7.5 7.5 0 0 1 -1.4 9.5 a7 7 0 0 1 -2.6 8 a7 7 0 0 1 -7 4 a6.5 6.5 0 0 1 -8 1 Z"/>
    <path d="M0 -17 V 16.5"/>
    <path d="M-13 -9 q4 1 5 4"/><path d="M13 -9 q-4 1 -5 4"/>
    <path d="M-18 2 q5 1 7 -2"/><path d="M18 2 q-5 1 -7 -2"/>
  </g>
</svg>`;
}

/** Anuncio de la calculadora con un ejemplo real calculado con el motor de la web. */
function anuncio(w: number, h: number): string {
  const r = calcular({ ...DATOS_VACIOS, comunidad: 'madrid', salario: 30000 });
  const pNeto = r.netoAnual / 30000;
  const pSs = r.ssTrabajador / 30000;
  const compacto = h === w;
  const y = (cuadrado: number, vertical: number) => (compacto ? cuadrado : vertical);
  const barra = w - 220;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${VERDE}"/>
  <text x="70" y="110" font-family="${SANS}" font-size="30" font-weight="700" fill="#fff" letter-spacing="4">BOLSILLO DIARIO</text>
  <text font-family="${SERIF}" font-size="${y(74, 84)}" font-weight="700" fill="#fff">
    <tspan x="70" y="${y(260, 300)}">¿Cuánto te quita</tspan>
    <tspan x="70" y="${y(350, 400)}">Hacienda de</tspan>
    <tspan x="70" y="${y(440, 500)}">tu sueldo?</tspan>
  </text>
  <rect x="70" y="${y(500, 580)}" width="${w - 140}" height="${y(300, 360)}" rx="28" fill="${PAPEL}"/>
  <text x="110" y="${y(565, 655)}" font-family="${SANS}" font-size="30" fill="#555">Sueldo bruto</text>
  <text x="${w - 110}" y="${y(565, 655)}" font-family="${SANS}" font-size="34" font-weight="700" fill="#16130d" text-anchor="end">30.000 €</text>
  <rect x="110" y="${y(600, 700)}" width="${barra}" height="38" rx="19" fill="#b23a2c"/>
  <rect x="110" y="${y(600, 700)}" width="${barra * (pNeto + pSs)}" height="38" rx="19" fill="#c98a12"/>
  <rect x="110" y="${y(600, 700)}" width="${barra * pNeto}" height="38" rx="19" fill="#0e7a4e"/>
  <text x="110" y="${y(700, 810)}" font-family="${SANS}" font-size="30" fill="#0e7a4e" font-weight="700">Neto ≈ ${miles(r.netoAnual)} €</text>
  <text x="${w - 110}" y="${y(700, 810)}" font-family="${SANS}" font-size="30" fill="#b23a2c" font-weight="700" text-anchor="end">IRPF + SS ≈ ${miles(30000 - r.netoAnual)} €</text>
  <text x="110" y="${y(760, 880)}" font-family="${SANS}" font-size="26" fill="#555">Ejemplo en Madrid. Calcula tu caso exacto</text>
  <rect x="70" y="${h - y(190, 230)}" width="${w - 140}" height="110" rx="55" fill="#fff"/>
  <text x="${w / 2}" y="${h - y(120, 160)}" font-family="${SANS}" font-size="38" font-weight="700" fill="${VERDE}" text-anchor="middle">Calcúlalo gratis en 1 minuto →</text>
</svg>`;
}

async function main(): Promise<void> {
  mkdirSync(DIR, { recursive: true });
  await sharp(Buffer.from(fotoPerfil())).resize(1080, 1080).png().toFile(resolve(DIR, 'foto-perfil.png'));
  await sharp(Buffer.from(anuncio(1080, 1080))).jpeg({ quality: 90 }).toFile(resolve(DIR, 'anuncio-irpf-cuadrado.jpg'));
  await sharp(Buffer.from(anuncio(1080, 1350))).jpeg({ quality: 90 }).toFile(resolve(DIR, 'anuncio-irpf-vertical.jpg'));
  console.log('Imágenes de campaña listas en public/redes/campana/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
