/**
 * Traduce al inglés los artículos de src/content/articulos/ y los guarda, con el mismo
 * nombre de archivo, en src/content/articulos-en/. Solo traduce los nuevos o los que han
 * cambiado desde la última traducción (se compara una huella del original guardada en
 * datos/traducciones.json). Los borradores no se traducen.
 *
 * Uso: npx tsx scripts/traducir.ts            (requiere ANTHROPIC_API_KEY)
 *      TRADUCIR_MAX=10 npx tsx scripts/traducir.ts   (limita cuántos traduce en una pasada)
 *      TRADUCIR_SLUGS=a,b npx tsx scripts/traducir.ts (solo esos)
 */
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const ORIGEN = 'src/content/articulos';
const DESTINO = 'src/content/articulos-en';
const REGISTRO = 'datos/traducciones.json';
const MODELO = process.env.MODELO_TRADUCCION || process.env.MODELO_REDACCION || 'claude-sonnet-5-5';
const MAXIMO = Number(process.env.TRADUCIR_MAX || 200);
const SOLO = (process.env.TRADUCIR_SLUGS || '').split(',').map((s) => s.trim()).filter(Boolean);
const EN_PARALELO = 4;

const SISTEMA = `You are a senior financial journalist and professional Spanish-to-English translator working for "Bolsillo Diario", a Spanish news site about the economy and personal finance.

You will receive one complete article as a Markdown file with YAML front matter. Return the SAME file translated into natural, clear British-leaning international English that reads as if it had been written in English by a journalist, not translated.

Hard rules:
- Output ONLY the translated file, starting with the line "---". No commentary, no code fences.
- Keep the YAML structure and every key name exactly as they are (keys stay in Spanish: titulo, subtitulo, tituloSeo, descripcion, clavesRapidas, etc.).
- Translate these values: titulo, subtitulo, tituloSeo, descripcion, imagenAlt, imagenCredito, porQueImporta, etiquetas, clavesRapidas, titularesAlternativos, and the body.
- Do NOT change: categoria, autor, fechaPublicacion, fechaActualizacion, imagen, the url of each source, booleans, ticker and other market fields. Keep the "titulo" of each source in its original language.
- Length limits: titulo up to 160 characters, tituloSeo up to 65, descripcion between 80 and 165, subtitulo up to 240.
- Always wrap translated YAML string values in double quotes and escape inner double quotes.
- Body: keep all Markdown (headings, tables, bold, images, links). Keep image paths unchanged and translate the alt text and captions. Rewrite internal links of the form /articulo/SLUG/ to /en/article/SLUG/ (same SLUG). Leave other links untouched.
- Never add, remove or soften facts, figures, attributions or caveats. Keep "alleged", "according to" and similar qualifiers.
- Explain Spain-specific terms briefly on first mention when a foreign reader would not know them (for example: IRPF, Spain's personal income tax; SMI, the minimum wage; Hacienda, the tax agency). Keep amounts in euros, write numbers in English style (1,200.50; 4.5%).
- No emojis.`;

function huella(texto: string): string {
  return createHash('sha256').update(texto).digest('hex').slice(0, 16);
}

function limpiar(salida: string): string {
  let t = salida.trim();
  const valla = t.match(/^```(?:markdown|md|yaml)?\n([\s\S]*?)\n```$/);
  if (valla) t = valla[1]!.trim();
  const i = t.indexOf('---');
  return (i > 0 ? t.slice(i) : t) + '\n';
}

/** Comprueba que lo devuelto es un artículo válido antes de guardarlo. */
function validar(original: string, traducido: string): void {
  const m = traducido.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('la traducción no tiene cabecera YAML');
  const datos = parse(m[1]!) as Record<string, unknown>;
  const orig = parse(original.match(/^---\n([\s\S]*?)\n---\n/)![1]!) as Record<string, unknown>;
  for (const k of ['titulo', 'subtitulo', 'tituloSeo', 'descripcion', 'imagenAlt', 'fuentes']) {
    if (!datos[k]) throw new Error(`falta el campo ${k}`);
  }
  for (const k of ['categoria', 'autor', 'imagen']) {
    if (String(datos[k]) !== String(orig[k])) throw new Error(`el campo ${k} no debía cambiar`);
  }
  if (String(datos.fechaPublicacion) !== String(orig.fechaPublicacion)) throw new Error('fecha cambiada');
  if (m[2]!.trim().length < original.length * 0.4) throw new Error('el cuerpo traducido es demasiado corto');
}

async function traducir(cliente: Anthropic, texto: string): Promise<string> {
  let ultimo: unknown;
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const flujo = cliente.messages.stream({
        model: MODELO,
        max_tokens: 20000,
        system: SISTEMA,
        messages: [{ role: 'user', content: texto }],
      });
      const resp = await flujo.finalMessage();
      if (resp.stop_reason === 'max_tokens') throw new Error('respuesta cortada');
      const salida = limpiar(resp.content.map((b) => (b.type === 'text' ? b.text : '')).join(''));
      validar(texto, salida);
      return salida;
    } catch (e) {
      ultimo = e;
      await new Promise((r) => setTimeout(r, 2 ** intento * 1500));
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error(String(ultimo));
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('Sin ANTHROPIC_API_KEY: no se traduce nada.');
    return;
  }
  mkdirSync(DESTINO, { recursive: true });
  const registro: Record<string, string> = existsSync(REGISTRO) ? JSON.parse(readFileSync(REGISTRO, 'utf8')) : {};
  const pendientes: { archivo: string; texto: string; h: string }[] = [];
  for (const archivo of readdirSync(ORIGEN).filter((f) => f.endsWith('.md')).sort()) {
    const slug = archivo.replace(/\.md$/, '');
    if (SOLO.length > 0 && !SOLO.includes(slug)) continue;
    const texto = readFileSync(join(ORIGEN, archivo), 'utf8');
    if (/^borrador:\s*true\s*$/m.test(texto)) continue;
    const h = huella(texto);
    if (registro[slug] === h && existsSync(join(DESTINO, archivo))) continue;
    pendientes.push({ archivo, texto, h });
  }
  // Primero las más recientes, que son las que más se leen.
  const fecha = (t: string) => t.match(/^fechaPublicacion:\s*(\S+)/m)?.[1] ?? '';
  pendientes.sort((a, b) => fecha(b.texto).localeCompare(fecha(a.texto)));
  const lote = pendientes.slice(0, MAXIMO);
  console.log(`Por traducir: ${pendientes.length}. En esta pasada: ${lote.length}. Modelo: ${MODELO}`);

  const cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let hechas = 0;
  let fallos = 0;
  const cola = [...lote];
  await Promise.all(
    Array.from({ length: EN_PARALELO }, async () => {
      for (;;) {
        const tarea = cola.shift();
        if (!tarea) return;
        const slug = tarea.archivo.replace(/\.md$/, '');
        try {
          const salida = await traducir(cliente, tarea.texto);
          writeFileSync(join(DESTINO, tarea.archivo), salida);
          registro[slug] = tarea.h;
          hechas++;
          console.log(`OK    ${slug}`);
        } catch (e) {
          fallos++;
          console.log(`FALLO ${slug}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }),
  );
  writeFileSync(REGISTRO, JSON.stringify(registro, null, 2) + '\n');
  console.log(`Traducidas: ${hechas}. Fallos: ${fallos}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
