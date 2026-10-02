// Lanza el panel privado. Uso:
//   npm run panel            → servidor de desarrollo con datos reales (datos/metricas)
//   npm run panel -- --demo  → servidor de desarrollo con datos de ejemplo (datos/ejemplo)
//   npm run panel -- --build → compila el panel (añade --demo para datos de ejemplo)
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const demo = args.includes('--demo');
const build = args.includes('--build');

const env = { ...process.env };
if (demo) env.PANEL_DEMO = '1';

const script = build ? 'build' : 'dev';
console.log(`Panel: ${script}${demo ? ' (modo demostración)' : ''}`);

const hijo = spawn('npm', ['--prefix', 'panel', 'run', script], {
  stdio: 'inherit',
  env,
});
hijo.on('exit', (code) => process.exit(code ?? 0));
