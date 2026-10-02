import { writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { ContextoEjecucion } from '../lib/contexto';
import { leerPrompt } from '../lib/contexto';

const AnalisisSchema = z.object({
  reglas: z.array(z.string()).min(1),
  temasEvergreen: z.array(z.string()).default([]),
  resumen: z.string(),
});
export type Analisis = z.infer<typeof AnalisisSchema>;

const DIR_METRICAS = resolve(process.cwd(), 'datos/metricas');
const ARCHIVO_APRENDIZAJES = resolve(process.cwd(), 'datos/aprendizajes.md');

function cargarMetricas(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!existsSync(DIR_METRICAS)) return out;
  for (const f of readdirSync(DIR_METRICAS)) {
    if (!f.endsWith('.json')) continue;
    try {
      out[f] = JSON.parse(readFileSync(resolve(DIR_METRICAS, f), 'utf8'));
    } catch {
      /* ignora archivos corruptos */
    }
  }
  return out;
}

/** Agente 12 — Analista de rendimiento (semanal). Escribe datos/aprendizajes.md. */
export async function analistaRendimiento(ctx: ContextoEjecucion): Promise<Analisis> {
  ctx.logger.paso('analista-rendimiento', 'Analizando métricas de la semana');
  const metricas = cargarMetricas();
  const hayMetricas = Object.keys(metricas).length > 0;

  let analisis: Analisis;
  if (ctx.sinApi || !hayMetricas || !ctx.config.anthropicApiKey) {
    analisis = analisisPorDefecto(hayMetricas);
  } else {
    const user = [
      'Métricas de la semana (JSON por fuente):',
      JSON.stringify(metricas, null, 2).slice(0, 12000),
    ].join('\n');
    try {
      analisis = await ctx.llm.generarJSON({
        agente: 'analista-rendimiento',
        modelo: ctx.config.modeloRedaccion,
        system: leerPrompt('12-analista-rendimiento'),
        user,
        schema: AnalisisSchema,
        maxTokens: 2000,
      });
    } catch (e) {
      ctx.logger.info(`Fallo del analista, uso valores por defecto: ${String(e)}`);
      analisis = analisisPorDefecto(hayMetricas);
    }
  }

  escribirAprendizajes(analisis, hayMetricas);
  return analisis;
}

function analisisPorDefecto(hayMetricas: boolean): Analisis {
  return {
    reglas: [
      'Prioriza el formato de servicio (plazos, requisitos, "cómo pedirlo"): suele rendir más que la noticia de dato.',
      'Pon el dato clave y su efecto en euros en la entradilla; no lo escondas para forzar el clic.',
      'Los titulares con una cifra concreta y una consecuencia clara funcionan mejor que los vagos.',
      'Refuerza temas de vivienda, hipotecas e IRPF cuando haya novedad oficial: son los de mayor interés del nicho.',
      'Incluye siempre una sección "Qué significa para ti" con un cálculo o ejemplo práctico.',
    ],
    temasEvergreen: [
      'Cómo se calcula la cuota de una hipoteca variable',
      'Guía del IRPF: tramos y deducciones habituales',
      'Cómo pedir la ayuda al alquiler paso a paso',
      'Qué es el IPC y cómo afecta a tus rentas y pensiones',
      'Depósitos y cuentas remuneradas: cómo comparar sin letra pequeña',
    ],
    resumen: hayMetricas
      ? 'Análisis con métricas disponibles (versión por defecto; conecta la API para un análisis más fino).'
      : 'Aún no hay métricas conectadas. Reglas base del medio hasta disponer de datos reales (ver GUIA_PASOS_MANUALES.md).',
  };
}

function escribirAprendizajes(a: Analisis, hayMetricas: boolean): void {
  const contenido = [
    '# Aprendizajes del medio',
    '',
    `_Última actualización: ${new Date().toISOString().slice(0, 10)}._`,
    hayMetricas ? '' : '_Nota: todavía sin métricas reales conectadas._',
    '',
    '## Reglas para los agentes (Editor jefe, Analista de audiencia, Titulador)',
    ...a.reglas.map((r) => `- ${r}`),
    '',
    '## Temas de fondo (evergreen) propuestos',
    ...a.temasEvergreen.map((t) => `- ${t}`),
    '',
    '## Resumen',
    a.resumen,
    '',
  ].join('\n');
  writeFileSync(ARCHIVO_APRENDIZAJES, contenido, 'utf8');
}
