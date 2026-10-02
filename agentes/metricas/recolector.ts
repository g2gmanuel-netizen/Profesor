import { recolectarRegistroAgentes } from './registro-agentes';
import { recolectarCostesIa, recolectarCostesFijos } from './costes';
import { recolectarGa4 } from './ga4';
import { recolectarSearchConsole } from './search-console';
import { recolectarAdsense } from './adsense';

/**
 * Orquestador de recolección de métricas. Cada fuente se aísla: si una falla o
 * carece de credenciales, no rompe el resto. Lo lanza el workflow cada 6 horas.
 */
async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('== Recolección de métricas ==');

  const tareas: { nombre: string; fn: () => string | Promise<string> }[] = [
    { nombre: 'registro de agentes', fn: recolectarRegistroAgentes },
    { nombre: 'coste de IA', fn: recolectarCostesIa },
    { nombre: 'costes fijos', fn: recolectarCostesFijos },
    { nombre: 'GA4', fn: recolectarGa4 },
    { nombre: 'Search Console', fn: recolectarSearchConsole },
    { nombre: 'AdSense', fn: recolectarAdsense },
  ];

  for (const t of tareas) {
    try {
      const ruta = await t.fn();
      // eslint-disable-next-line no-console
      console.log(`  ✓ ${t.nombre} → ${ruta}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`  · ${t.nombre}: ${String(e)}`);
    }
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Error en la recolección de métricas:', e);
  process.exit(1);
});
