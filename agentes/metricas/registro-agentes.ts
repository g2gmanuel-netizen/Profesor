import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { guardarMetrica } from './lib';

const DIR_LOGS = resolve(process.cwd(), 'logs');

interface Registro {
  agente: string;
  estado: string;
  duracionMs?: number;
  tokensEntrada?: number;
  tokensSalida?: number;
  costeUsd?: number;
  motivo?: string;
  articulo?: string;
}

/** Recolector del registro de agentes: agrega los logs .jsonl del orquestador. */
export function recolectarRegistroAgentes(): string {
  const porAgente: Record<
    string,
    { ejecuciones: number; ok: number; error: number; rechazado: number; costeUsd: number; motivos: string[] }
  > = {};

  if (existsSync(DIR_LOGS)) {
    for (const f of readdirSync(DIR_LOGS)) {
      if (!f.endsWith('.jsonl')) continue;
      const lineas = readFileSync(resolve(DIR_LOGS, f), 'utf8').split('\n').filter(Boolean);
      for (const l of lineas) {
        let r: Registro;
        try {
          r = JSON.parse(l) as Registro;
        } catch {
          continue;
        }
        const a = (porAgente[r.agente] ??= {
          ejecuciones: 0,
          ok: 0,
          error: 0,
          rechazado: 0,
          costeUsd: 0,
          motivos: [],
        });
        a.ejecuciones++;
        if (r.estado === 'ok') a.ok++;
        else if (r.estado === 'error') a.error++;
        else if (r.estado === 'rechazado') a.rechazado++;
        a.costeUsd += r.costeUsd ?? 0;
        if (r.motivo) a.motivos.push(r.motivo);
      }
    }
  }

  const resumen = Object.entries(porAgente).map(([agente, v]) => ({
    agente,
    ejecuciones: v.ejecuciones,
    exitoPct: v.ejecuciones ? Math.round((v.ok / v.ejecuciones) * 100) : 0,
    rechazoPct: v.ejecuciones ? Math.round((v.rechazado / v.ejecuciones) * 100) : 0,
    costeUsd: Math.round(v.costeUsd * 10000) / 10000,
    motivosFrecuentes: v.motivos.slice(0, 10),
  }));

  return guardarMetrica('agentes', { estado: 'ok', agentes: resumen });
}
