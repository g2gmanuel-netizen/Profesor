import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { Llm } from './anthropic';
import { ContadorCostes } from './costes';
import { Logger } from './logger';
import { CONFIG } from '../config/config';

export interface ContextoEjecucion {
  ejecucionId: string;
  sinApi: boolean;
  simulacion: boolean;
  llm: Llm;
  costes: ContadorCostes;
  logger: Logger;
  config: typeof CONFIG;
  /** Aprendizajes del analista semanal, que leen los agentes 2, 4 y 6. */
  aprendizajes: string;
}

export function leerPrompt(nombre: string): string {
  const ruta = resolve(process.cwd(), 'agentes/prompts', `${nombre}.md`);
  return readFileSync(ruta, 'utf8');
}

export function leerAprendizajes(): string {
  const ruta = resolve(process.cwd(), 'datos/aprendizajes.md');
  if (!existsSync(ruta)) return '';
  try {
    return readFileSync(ruta, 'utf8');
  } catch {
    return '';
  }
}

export function crearContexto(opts: {
  ejecucionId: string;
  sinApi: boolean;
  simulacion: boolean;
}): ContextoEjecucion {
  const logger = new Logger(opts.ejecucionId);
  const costes = new ContadorCostes(CONFIG.presupuestoDiarioUsd);
  const llm = new Llm(costes, logger);
  return {
    ...opts,
    llm,
    costes,
    logger,
    config: CONFIG,
    aprendizajes: leerAprendizajes(),
  };
}
