# Bolsillo Diario

Medio digital automatizado sobre **economía doméstica en España** (vivienda, alquiler, hipotecas, ahorro, impuestos, pensiones y precios). Detecta noticias de fuentes oficiales, las investiga, redacta, verifica y publica mediante una cadena de **12 agentes de IA** (Claude), en una web estática rápida y optimizada para SEO, preparada para monetizar con Google AdSense.

> ¿No eres técnico? Ve directamente a **[`GUIA_PASOS_MANUALES.md`](./GUIA_PASOS_MANUALES.md)**: explica, paso a paso, todo lo que tienes que hacer tú.

---

## Qué incluye

- **Web pública** (Astro + TypeScript + Markdown): portada, categorías, artículo, autor, buscador, páginas legales, `sitemap.xml`, sitemap de noticias, RSS, `robots.txt`, `ads.txt`, datos estructurados `NewsArticle`/`Organization`/`Person`/`BreadcrumbList`.
- **Motor de agentes** (`/agentes`): 12 agentes con prompts editables, validación con Zod, control de costes y modo simulación.
- **Panel privado** (`/panel`): 6 pantallas (Resumen, Agentes, Audiencia, Contenido, Finanzas, Alertas) con Chart.js y modo demostración.
- **Automatización** (`.github/workflows`): redacción 3×/día, analista semanal, métricas cada 6 h, tests y Lighthouse CI.
- **Publicidad y consentimiento** desactivados por defecto (AdSense + CMP + Consent Mode v2).

## Requisitos

- Node.js ≥ 20 y npm.
- (Opcional) `ANTHROPIC_API_KEY` para ejecutar el pipeline en real.

## Puesta en marcha

```bash
npm install
cp .env.example .env     # rellena tus valores
npm run dev              # web en http://localhost:4321
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo de la web. |
| `npm run build` | Compila la web a `dist/`. |
| `npm test` | Tests (Vitest): esquemas, verificador, cumplimiento, rúbrica, sitemaps, cálculos financieros. |
| `npm run lint` | ESLint. |
| `npm run redaccion` | Ejecuta el pipeline completo de agentes (requiere `ANTHROPIC_API_KEY`). |
| `npm run redaccion -- --simulacion` | Ejecuta todo el proceso **sin publicar**. |
| `npm run redaccion -- --simulacion --sin-api` | Simulación **sin gastar API** (usa fixtures). |
| `npm run redaccion -- --semanal` | Ejecuta el analista de rendimiento (actualiza `datos/aprendizajes.md`). |
| `npm run metricas` | Recolecta métricas en `datos/metricas/`. |
| `npm run panel` | Panel privado con datos reales. |
| `npm run panel -- --demo` | Panel con datos de ejemplo (demostración). |
| `npm run panel -- --build --demo` | Compila el panel en modo demostración. |

## Estructura

```
src/                 Web pública (Astro)
  content/articulos/ Artículos en Markdown (frontmatter validado con Zod)
  components/        Componentes (Anuncio, Consentimiento, Analítica, ...)
  layouts/ pages/    Plantillas y páginas
  lib/               Config del sitio, consultas de artículos, sitemaps
agentes/             Motor de agentes
  agentes/           Los 12 agentes (01..12)
  prompts/           Prompt de sistema de cada agente (EDITABLE sin tocar código)
  lib/               SDK Anthropic, esquemas Zod, costes, logger, fuentes, rúbrica
  metricas/          Recolectores de métricas (GA4, Search Console, AdSense, costes)
  config/            config.ts y fuentes.yaml
  orquestador.ts     Orquesta el pipeline
panel/               Panel privado (Astro + Chart.js)
datos/               Estado y memoria (JSON/YAML versionados) + ejemplo/ para demo
tests/               Tests con Vitest
.github/workflows/   Automatización (CI y cron)
```

## Cómo cambiar el nicho

El nicho y las categorías viven en `src/lib/sitio.ts` (constante `CATEGORIAS` y `SITIO.nicho`). Ajusta también `agentes/config/fuentes.yaml` con fuentes del nuevo tema. Los prompts de los agentes en `agentes/prompts/*.md` mencionan el nicho; actualízalos para afinar el tono.

## Cómo editar los prompts de los agentes

Cada agente lee su prompt de sistema desde `agentes/prompts/<n>-<nombre>.md`. Puedes editarlos sin tocar el código: el cambio se aplica en la siguiente ejecución.

## Revisión humana → publicación automática

- `REVISION_HUMANA=true` (por defecto): la edición diaria se abre como **pull request** para que una persona la apruebe.
- `REVISION_HUMANA=false`: se publica por **commit directo** a `main`. Actívalo solo cuando confíes en la calidad (ver guía).

## Control de costes

El contador en `datos/costes.json` registra tokens y coste por agente y detiene la ejecución si se supera `PRESUPUESTO_DIARIO_USD` (por defecto 3).

## Privacidad

El repositorio **debe ser privado** (el panel y `datos/` contienen información económica). El panel nunca se publica en abierto: se protege con Cloudflare Access.

## Variables de entorno

Ver `.env.example`. Nunca subas `.env` (está en `.gitignore`).

---

_Contenido elaborado con asistencia de IA y revisión editorial humana. Ver la política editorial del propio sitio._
