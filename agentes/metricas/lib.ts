import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const DIR_METRICAS = resolve(process.cwd(), 'datos/metricas');

export function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export function guardarMetrica(fuente: string, datos: unknown): string {
  mkdirSync(DIR_METRICAS, { recursive: true });
  const ruta = resolve(DIR_METRICAS, `${fuente}-${hoy()}.json`);
  writeFileSync(
    ruta,
    JSON.stringify({ fuente, fecha: hoy(), actualizado: new Date().toISOString(), ...(datos as object) }, null, 2),
    'utf8',
  );
  return ruta;
}

export function pendiente(_fuente: string, falta: string[], paso: string): object {
  return {
    estado: 'pendiente',
    mensaje: `Pendiente de conectar — ver ${paso} de la guía`,
    falta,
    datos: null,
  };
}

/** Crea un cliente autenticado de google con cuenta de servicio (GA4 y Search Console). */
export async function authCuentaServicio(scopes: string[]): Promise<unknown | null> {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  try {
    const { GoogleAuth } = (await import('google-auth-library')) as typeof import('google-auth-library');
    const credentials = JSON.parse(json);
    const auth = new GoogleAuth({ credentials, scopes });
    return await auth.getClient();
  } catch {
    return null;
  }
}
