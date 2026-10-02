// Genera un conjunto de datos de ejemplo en datos/ejemplo/ para el modo demostración del panel.
// Ejecuta: node scripts/generar-ejemplo.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = resolve(process.cwd(), 'datos/ejemplo');
mkdirSync(DIR, { recursive: true });

const DIAS = 30;
const hoy = new Date('2026-10-01');
const fechas = Array.from({ length: DIAS }, (_, i) => {
  const d = new Date(hoy);
  d.setDate(d.getDate() - (DIAS - 1 - i));
  return d.toISOString().slice(0, 10);
});

// Tráfico con tendencia creciente + ruido determinista.
const rnd = (seed) => {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};
const diasGa4 = fechas.map((fecha, i) => {
  const base = 300 + i * 45;
  const usuarios = Math.round(base * (0.85 + rnd(i + 1) * 0.3));
  const paginasVistas = Math.round(usuarios * (1.8 + rnd(i + 7) * 0.6));
  return {
    fecha,
    usuarios,
    sesiones: Math.round(usuarios * 1.2),
    paginasVistas,
    duracionMediaS: Math.round(90 + rnd(i + 3) * 60),
    nuevos: Math.round(usuarios * 0.7),
    recurrentes: Math.round(usuarios * 0.3),
  };
});

const totalPv = diasGa4.reduce((a, d) => a + d.paginasVistas, 0);

writeFileSync(
  resolve(DIR, 'ga4.json'),
  JSON.stringify(
    {
      estado: 'ok',
      dias: diasGa4,
      fuentesTrafico: { discover: 0.42, busqueda: 0.38, directo: 0.12, redes: 0.08 },
      dispositivos: { movil: 0.83, escritorio: 0.17 },
      topArticulos: [
        { slug: 'euribor-que-es-y-como-afecta-a-tu-hipoteca', titulo: 'Qué es el Euríbor y cómo afecta a tu hipoteca', paginasVistas: Math.round(totalPv * 0.22) },
        { slug: 'ipc-septiembre', titulo: 'IPC de septiembre: qué sube más', paginasVistas: Math.round(totalPv * 0.17) },
        { slug: 'ayuda-alquiler-requisitos', titulo: 'Cómo pedir la ayuda al alquiler', paginasVistas: Math.round(totalPv * 0.15) },
        { slug: 'irpf-cambios-2027', titulo: '5 cambios del IRPF que te afectan', paginasVistas: Math.round(totalPv * 0.12) },
        { slug: 'pensiones-2027', titulo: 'Pensiones 2027: cuánto cobrarás', paginasVistas: Math.round(totalPv * 0.1) },
      ],
    },
    null,
    2,
  ),
);

writeFileSync(
  resolve(DIR, 'search-console.json'),
  JSON.stringify(
    {
      estado: 'ok',
      site: 'https://ejemplo.local/',
      discover: { clics: 5400, impresiones: 182000 },
      consultas: [
        { consulta: 'euríbor hoy', clics: 820, impresiones: 21000, ctr: 0.039, posicion: 4.2 },
        { consulta: 'ayuda alquiler requisitos', clics: 610, impresiones: 12400, ctr: 0.049, posicion: 3.1 },
        { consulta: 'ipc septiembre', clics: 540, impresiones: 18800, ctr: 0.028, posicion: 5.6 },
        { consulta: 'cambios irpf 2027', clics: 430, impresiones: 9900, ctr: 0.043, posicion: 3.8 },
        { consulta: 'cuánto sube la pensión', clics: 390, impresiones: 15200, ctr: 0.025, posicion: 6.9 },
      ],
    },
    null,
    2,
  ),
);

// AdSense de ejemplo (ya "aprobado" para que la demo enseñe ingresos).
const rpmSitio = 4.6;
const diasAdsense = diasGa4.map((d) => ({ fecha: d.fecha, ingresos: Math.round(((d.paginasVistas * rpmSitio) / 1000) * 100) / 100 }));
const ingresos30 = Math.round(diasAdsense.reduce((a, d) => a + d.ingresos, 0) * 100) / 100;
writeFileSync(
  resolve(DIR, 'adsense.json'),
  JSON.stringify(
    {
      estado: 'ok',
      accountId: 'pub-DEMO',
      ingresos30d: ingresos30,
      rpm: rpmSitio,
      paginasVistasMonetizadas: totalPv,
      impresiones: Math.round(totalPv * 1.4),
      clics: Math.round(totalPv * 0.012),
      ctr: 0.012,
      dias: diasAdsense,
    },
    null,
    2,
  ),
);

// Registro de agentes de ejemplo: última ejecución + kanban + agregados.
const agentes = [
  'rastreador','editor-jefe','investigador','analista-audiencia','redactor',
  'titulador','verificador','cumplimiento','seo-discover','ilustrador','publicador',
];
let t = Date.parse('2026-10-01T07:00:00Z');
const timeline = agentes.map((a, i) => {
  const dur = 1500 + Math.round(rnd(i + 2) * 6000);
  const inicio = t;
  t += dur;
  return { agente: a, inicio: new Date(inicio).toISOString(), duracionMs: dur, estado: 'ok', costeUsd: Math.round(rnd(i + 5) * 0.08 * 1000) / 1000 };
});

writeFileSync(
  resolve(DIR, 'agentes.json'),
  JSON.stringify(
    {
      estado: 'ok',
      ultimaEjecucion: { inicio: '2026-10-01T07:00:00Z', timeline },
      kanban: [
        { articulo: 'Euríbor de octubre', fase: 'publicado' },
        { articulo: 'Nueva deducción autonómica', fase: 'verificado' },
        { articulo: 'Precio de la luz esta semana', fase: 'redactado' },
        { articulo: 'Rumor sin fuente oficial', fase: 'rechazado' },
      ],
      porAgente: agentes.map((a, i) => ({
        agente: a,
        ejecuciones: 40 + Math.round(rnd(i) * 20),
        exitoPct: 80 + Math.round(rnd(i + 1) * 18),
        rechazoPct: Math.round(rnd(i + 2) * 12),
        costeUsd: Math.round(rnd(i + 3) * 2 * 100) / 100,
        motivosFrecuentes: i === 6 ? ['cifra sin respaldo'] : i === 7 ? ['titular poco fiel'] : [],
      })),
      errores: [
        { fecha: '2026-09-29T13:02:00Z', agente: 'investigador', mensaje: 'Fuente caída (timeout INE)', log: '#' },
      ],
    },
    null,
    2,
  ),
);

// Coste de IA de ejemplo (por día).
const diasCostes = {};
for (const d of diasGa4) diasCostes[d.fecha] = { costeUsd: Math.round((1 + rnd(Date.parse(d.fecha)) * 1.8) * 100) / 100 };
writeFileSync(
  resolve(DIR, 'costes-ia.json'),
  JSON.stringify({ estado: 'ok', dias: diasCostes }, null, 2),
);

writeFileSync(
  resolve(DIR, 'costes-fijos.json'),
  JSON.stringify(
    {
      estado: 'ok',
      moneda: 'EUR',
      conceptos: [
        { concepto: 'Dominio (.es)', importe: 12, periodicidad: 'anual' },
        { concepto: 'Hosting', importe: 0, periodicidad: 'mensual' },
        { concepto: 'Newsletter', importe: 9, periodicidad: 'mensual' },
      ],
    },
    null,
    2,
  ),
);

console.log('Datos de ejemplo generados en datos/ejemplo/');
