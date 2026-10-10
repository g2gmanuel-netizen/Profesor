import Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { CONFIG } from '../config/config';
import { ContadorCostes } from './costes';
import { Logger } from './logger';

export interface OpcionesLlm<S extends z.ZodTypeAny> {
  agente: string;
  modelo: string;
  system: string;
  user: string;
  schema: S;
  maxTokens?: number;
  articulo?: string;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Convierte un esquema Zod en el JSON Schema que espera la API como `input_schema`
 * de una herramienta. Se inlinean las referencias ($refStrategy 'none') para evitar
 * problemas de resolución y se quita la clave `$schema`, que la API no necesita.
 */
function esquemaJsonDeZod(schema: z.ZodTypeAny): Record<string, unknown> {
  const js = zodToJsonSchema(schema, { $refStrategy: 'none', target: 'jsonSchema7' }) as Record<
    string,
    unknown
  >;
  delete js.$schema;
  return js;
}

/** Red de seguridad: extrae un objeto JSON de un texto (por si el modelo responde sin usar la herramienta). */
function extraerJSONDeTexto(texto: string): unknown {
  const limpio = texto.trim();
  const valla = limpio.match(/```(?:json)?\s*([\s\S]*?)```/);
  const cand = valla ? valla[1]! : limpio;
  const i = cand.indexOf('{');
  const f = cand.lastIndexOf('}');
  if (i === -1 || f === -1) throw new Error('La respuesta no contiene JSON.');
  return JSON.parse(cand.slice(i, f + 1));
}

export class Llm {
  private cliente: Anthropic | null = null;
  constructor(
    private contador: ContadorCostes,
    private logger: Logger,
  ) {}

  private obtenerCliente(): Anthropic {
    if (!CONFIG.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY no está definida. Usa el modo --sin-api para simular.');
    }
    this.cliente ??= new Anthropic({ apiKey: CONFIG.anthropicApiKey });
    return this.cliente;
  }

  /**
   * Llama al modelo pidiéndole que rellene una "herramienta" cuyo esquema es el
   * esquema Zod del agente. Normalmente la API devuelve el resultado como un objeto
   * ya parseado (`tool_use.input`), de modo que no se rompe por comillas sin escapar.
   * Se usa `tool_choice: auto` (los modelos nuevos como Sonnet 5.5 rechazan el forzado)
   * con una instrucción fuerte; si aun así respondiera en texto, se extrae el JSON.
   * Valida con Zod y reintenta con espera exponencial.
   */
  async generarJSON<S extends z.ZodTypeAny>(opts: OpcionesLlm<S>): Promise<z.infer<S>> {
    const cliente = this.obtenerCliente();
    const maxIntentos = 4;
    let ultimoError: unknown;

    const herramienta: Anthropic.Tool = {
      name: 'responder',
      description: 'Devuelve el resultado en el formato estructurado requerido.',
      input_schema: esquemaJsonDeZod(opts.schema) as Anthropic.Tool.InputSchema,
    };

    for (let intento = 1; intento <= maxIntentos; intento++) {
      try {
        this.contador.comprobarPresupuesto();
        const resp = await cliente.messages.create({
          model: opts.modelo,
          max_tokens: opts.maxTokens ?? 8000,
          system:
            opts.system +
            '\n\nResponde SIEMPRE llamando a la herramienta «responder» con el resultado. No escribas texto fuera de la herramienta.',
          messages: [{ role: 'user', content: opts.user }],
          tools: [herramienta],
          tool_choice: { type: 'auto', disable_parallel_tool_use: true },
        });

        const entrada = resp.usage.input_tokens;
        const salida = resp.usage.output_tokens;
        const costeUsd = this.contador.calcularCoste(opts.modelo, entrada, salida);
        this.contador.registrar({
          agente: opts.agente,
          modelo: opts.modelo,
          tokensEntrada: entrada,
          tokensSalida: salida,
          costeUsd,
        });

        if (resp.stop_reason === 'max_tokens') {
          throw new Error(
            `Respuesta cortada por límite de tokens en ${opts.agente} (sube maxTokens).`,
          );
        }

        const bloque = resp.content.find(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        );
        let datos: unknown;
        if (bloque) {
          datos = bloque.input;
        } else {
          // Red de seguridad: el modelo respondió en texto en vez de usar la herramienta.
          const texto = resp.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map((b) => b.text)
            .join('');
          datos = extraerJSONDeTexto(texto);
        }

        const parsed = opts.schema.safeParse(datos);
        if (!parsed.success) {
          throw new Error(`JSON no válido para ${opts.agente}: ${parsed.error.message}`);
        }
        return parsed.data;
      } catch (e: unknown) {
        ultimoError = e;
        const status = (e as { status?: number })?.status;
        const reintetable = status === 429 || status === 529 || (status ?? 0) >= 500 || status === undefined;
        if (!reintetable || intento === maxIntentos) break;
        const espera = 2 ** intento * 1000;
        this.logger.info(`Reintento ${intento}/${maxIntentos} de ${opts.agente} en ${espera / 1000}s (${String(status ?? e)})`);
        await dormir(espera);
      }
    }
    throw ultimoError instanceof Error ? ultimoError : new Error(String(ultimoError));
  }
}
