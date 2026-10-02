import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR_LOGS = resolve(process.cwd(), 'logs');

export interface RegistroAgente {
  ts: string;
  ejecucionId: string;
  agente: string;
  estado: 'ok' | 'error' | 'rechazado';
  duracionMs: number;
  tokensEntrada?: number;
  tokensSalida?: number;
  costeUsd?: number;
  motivo?: string;
  articulo?: string;
}

export class Logger {
  private ejecucionId: string;
  private archivo: string;

  constructor(ejecucionId: string) {
    this.ejecucionId = ejecucionId;
    if (!existsSync(DIR_LOGS)) mkdirSync(DIR_LOGS, { recursive: true });
    const dia = new Date().toISOString().slice(0, 10);
    this.archivo = resolve(DIR_LOGS, `redaccion-${dia}.jsonl`);
  }

  info(mensaje: string): void {
    // eslint-disable-next-line no-console
    console.log(`  · ${mensaje}`);
  }

  paso(agente: string, mensaje: string): void {
    // eslint-disable-next-line no-console
    console.log(`[${agente}] ${mensaje}`);
  }

  registrar(r: Omit<RegistroAgente, 'ts' | 'ejecucionId'>): void {
    const registro: RegistroAgente = {
      ts: new Date().toISOString(),
      ejecucionId: this.ejecucionId,
      ...r,
    };
    try {
      appendFileSync(this.archivo, JSON.stringify(registro) + '\n', 'utf8');
    } catch {
      // No romper la ejecución por un fallo de logging.
    }
  }
}
