import Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
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

/** Extrae el primer bloque JSON de un texto (tolerante a ```json ... ``` y texto alrededor). */
export function extraerJSON(texto: string): unknown {
  const limpio = texto.trim();
  const valla = limpio.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidato = valla ? valla[1]! : limpio;
  const inicio = candidato.indexOf('{');
  const fin = candidato.lastIndexOf('}');
  if (inicio === -1 || fin === -1) throw new Error('La respuesta no contiene JSON.');
  return JSON.parse(candidato.slice(inicio, fin + 1));
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

  /** Llama al modelo pidiendo JSON, valida con Zod y reintenta con espera exponencial. */
  async generarJSON<S extends z.ZodTypeAny>(opts: OpcionesLlm<S>): Promise<z.infer<S>> {
    const cliente = this.obtenerCliente();
    const maxIntentos = 4;
    let ultimoError: unknown;

    for (let intento = 1; intento <= maxIntentos; intento++) {
      try {
        this.contador.comprobarPresupuesto();
        const resp = await cliente.messages.create({
          model: opts.modelo,
          max_tokens: opts.maxTokens ?? 2048,
          system: opts.system + '\n\nResponde ÚNICAMENTE con un objeto JSON válido, sin texto adicional.',
          messages: [{ role: 'user', content: opts.user }],
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

        const texto = resp.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('');
        const json = extraerJSON(texto);
        const parsed = opts.schema.safeParse(json);
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
