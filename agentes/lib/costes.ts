import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { precioModelo } from '../config/config';

const ARCHIVO = resolve(process.cwd(), 'datos/costes.json');

export interface UsoAgente {
  agente: string;
  modelo: string;
  tokensEntrada: number;
  tokensSalida: number;
  costeUsd: number;
}

interface CostesDia {
  fecha: string;
  costeUsd: number;
  tokensEntrada: number;
  tokensSalida: number;
  porAgente: Record<string, { tokensEntrada: number; tokensSalida: number; costeUsd: number }>;
}

interface ArchivoCostes {
  dias: Record<string, CostesDia>;
}

export class PresupuestoExcedidoError extends Error {}

export class ContadorCostes {
  private datos: ArchivoCostes;
  private hoy: string;
  private presupuesto: number;
  private gastoSesion = 0;

  constructor(presupuestoDiarioUsd: number) {
    this.presupuesto = presupuestoDiarioUsd;
    this.hoy = new Date().toISOString().slice(0, 10);
    this.datos = this.cargar();
    if (!this.datos.dias[this.hoy]) {
      this.datos.dias[this.hoy] = {
        fecha: this.hoy,
        costeUsd: 0,
        tokensEntrada: 0,
        tokensSalida: 0,
        porAgente: {},
      };
    }
  }

  private cargar(): ArchivoCostes {
    if (existsSync(ARCHIVO)) {
      try {
        return JSON.parse(readFileSync(ARCHIVO, 'utf8')) as ArchivoCostes;
      } catch {
        /* archivo corrupto: empezar de cero */
      }
    }
    return { dias: {} };
  }

  calcularCoste(modelo: string, tokensEntrada: number, tokensSalida: number): number {
    const p = precioModelo(modelo);
    return (tokensEntrada / 1_000_000) * p.entrada + (tokensSalida / 1_000_000) * p.salida;
  }

  registrar(uso: UsoAgente): void {
    const dia = this.datos.dias[this.hoy]!;
    dia.costeUsd += uso.costeUsd;
    dia.tokensEntrada += uso.tokensEntrada;
    dia.tokensSalida += uso.tokensSalida;
    this.gastoSesion += uso.costeUsd;
    const a = (dia.porAgente[uso.agente] ??= {
      tokensEntrada: 0,
      tokensSalida: 0,
      costeUsd: 0,
    });
    a.tokensEntrada += uso.tokensEntrada;
    a.tokensSalida += uso.tokensSalida;
    a.costeUsd += uso.costeUsd;
    this.persistir();
  }

  /** Lanza PresupuestoExcedidoError si el gasto del día supera el presupuesto. */
  comprobarPresupuesto(): void {
    const dia = this.datos.dias[this.hoy]!;
    if (dia.costeUsd >= this.presupuesto) {
      throw new PresupuestoExcedidoError(
        `Presupuesto diario superado: ${dia.costeUsd.toFixed(2)} USD de ${this.presupuesto} USD.`,
      );
    }
  }

  gastoHoy(): number {
    return this.datos.dias[this.hoy]!.costeUsd;
  }

  gastoDeSesion(): number {
    return this.gastoSesion;
  }

  private persistir(): void {
    try {
      mkdirSync(dirname(ARCHIVO), { recursive: true });
      writeFileSync(ARCHIVO, JSON.stringify(this.datos, null, 2), 'utf8');
    } catch {
      /* no romper por fallo de escritura */
    }
  }
}
