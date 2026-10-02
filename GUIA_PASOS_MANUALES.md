# Guía de pasos manuales — Bolsillo Diario

Esta guía está escrita para una persona **sin conocimientos técnicos**. Son los pasos que **solo tú puedes hacer** (crear cuentas, pagar, poner claves, aprobar). Ve marcando las casillas `- [ ]` según los completes.

> Un *término técnico* se explica la primera vez. Ejemplo: un *repositorio* es la carpeta de tu proyecto guardada en internet (en GitHub).

**Antes de empezar, rellena estos datos** (los usarás varias veces):

- Nombre del medio: **Bolsillo Diario**
- Dominio que quieres: **[PENDIENTE]** (ej. `bolsillodiario.es`)
- Tu nombre (responsable): **[PENDIENTE]**
- Tu email de contacto: **[PENDIENTE]**

---

## 1. Cuentas que necesitas

Crea estas cuentas (todas tienen plan gratuito salvo el dominio y el gasto de la API):

- [ ] **GitHub** (github.com) — guardará el código. *Gratis.* ~5 min.
- [ ] **Cloudflare** (cloudflare.com) **o Vercel** (vercel.com) — publicará la web. *Gratis.* ~5 min.
- [ ] **Anthropic** (console.anthropic.com) — la IA que escribe. *De pago por uso.* ~10 min.
  - [ ] Crea una **clave de API** (*API key*: una contraseña que usa el robot para hablar con la IA). En la consola: **Settings → API Keys → Create Key**. Cópiala; empieza por `sk-ant-...`.
  - [ ] **Pon un límite de gasto mensual** para no llevarte sustos: **Settings → Limits / Billing → Usage limits**. Empieza con algo bajo (p. ej. 20 $/mes).
- [ ] **Google** — para posicionar y medir:
  - [ ] **Search Console** (search.google.com/search-console)
  - [ ] **Analytics 4** (analytics.google.com)
  - [ ] **AdSense** (adsense.google.com) — lo solicitas más adelante (paso 11).

> Coste orientativo mensual: dominio ~1 €/mes (12 €/año), hosting 0 €, IA según uso (con 3-6 artículos/día y presupuesto de 3 $/día, como mucho ~90 $/mes; normalmente mucho menos). Ver tabla final.

---

## 2. Subir el proyecto a GitHub

- [ ] Entra en GitHub y crea un **repositorio nuevo y PRIVADO** (botón **New**, marca **Private**). Llámalo, por ejemplo, `bolsillo-diario`.
- [ ] Si Claude Code ya ha dejado el código en este ordenador, en la terminal del proyecto escribe (sustituye `TU-USUARIO`):

```bash
git remote add origin https://github.com/TU-USUARIO/bolsillo-diario.git
git push -u origin main
```

- [ ] Si te pide iniciar sesión, sigue las instrucciones del navegador.

> **Importante:** el repositorio debe ser **privado** porque la carpeta `datos/` guarda cifras económicas.

---

## 3. Guardar las claves como *GitHub Secrets*

Un *secret* es una contraseña que GitHub guarda escondida para que el robot la use sin que nadie la vea.

- [ ] En tu repositorio: **Settings → Secrets and variables → Actions**.
- [ ] En la pestaña **Secrets**, pulsa **New repository secret** y añade:

| Nombre del secret | De dónde sale |
|---|---|
| `ANTHROPIC_API_KEY` | La clave de Anthropic del paso 1 (`sk-ant-...`). |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | El contenido del archivo JSON de la cuenta de servicio (paso 12 bis). *Opcional al principio.* |
| `ADSENSE_OAUTH_CLIENT_ID` | Del paso 12 bis (AdSense). *Opcional.* |
| `ADSENSE_OAUTH_CLIENT_SECRET` | Del paso 12 bis. *Opcional.* |
| `ADSENSE_REFRESH_TOKEN` | Del paso 12 bis. *Opcional.* |

- [ ] En la pestaña **Variables** (al lado), pulsa **New repository variable** y añade (no son secretas):

| Nombre de la variable | Valor |
|---|---|
| `REVISION_HUMANA` | `true` (déjalo así al principio). |
| `PRESUPUESTO_DIARIO_USD` | `3` |
| `MODELO_REDACCION` | `claude-opus-4-8` (o el que prefieras). |
| `MODELO_RAPIDO` | `claude-haiku-4-5-20251001` |
| `AUTOR_RESPONSABLE` | Tu nombre real. |
| `GA4_PROPERTY_ID` | Del paso 9. *Opcional.* |
| `SEARCH_CONSOLE_SITE_URL` | `https://TU-DOMINIO/` (paso 8). *Opcional.* |
| `ADSENSE_ACCOUNT_ID` | `pub-XXXX` (paso 11). *Opcional.* |

---

## 4. Conectar el hosting y publicar la web

Elige **una** opción.

**Cloudflare Pages (recomendado):**
- [ ] En Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**.
- [ ] Elige tu repositorio `bolsillo-diario`.
- [ ] Configuración de compilación: **Framework: Astro**; **Build command:** `npm run build`; **Output:** `dist`.
- [ ] En **Environment variables** del proyecto, añade `DOMINIO` con tu dominio, y las demás que quieras (las mismas de arriba).
- [ ] Pulsa **Save and Deploy**. En 1-2 minutos tendrás una URL tipo `tu-proyecto.pages.dev`.

**Vercel (alternativa):**
- [ ] En Vercel: **Add New → Project → Import** tu repositorio. Framework **Astro**. Deploy.

> La web se vuelve a publicar sola cada vez que se actualiza la rama `main`.

---

## 5. Comprar el dominio y conectarlo

- [ ] Compra el dominio (en Cloudflare Registrar, o cualquier registrador: ~12 €/año). **Esto lo haces tú** (hay que pagar).
- [ ] En tu proyecto de Pages/Vercel: **Custom domains → Add domain** y escribe tu dominio.
- [ ] Te pedirá crear registros **DNS**. Ejemplo típico (Cloudflare lo hace casi solo):

```
Tipo   Nombre   Valor
CNAME  www      tu-proyecto.pages.dev
A / CNAME  @     (lo que indique el panel de hosting)
```

- [ ] Cuando el dominio esté activo, actualiza la variable `DOMINIO` con él (sin `https://`).

---

## 6. Rellenar los datos legales (no los puedo inventar)

Edita el archivo **`.env`** (o las variables del hosting) y pon tus datos reales:

- [ ] `AUTOR_RESPONSABLE` = tu nombre.
- [ ] `EMAIL_CONTACTO` = tu email público.
- [ ] En `src/lib/sitio.ts`, dentro de `SITIO.legal`, rellena **NIF** y **domicilio** (ahora ponen `[PENDIENTE]`). Estos aparecen en el **Aviso legal** y la **Política de privacidad**.

> Si no tienes NIF/domicilio de actividad todavía, consulta con un gestor antes de monetizar.

---

## 7. Completar la página de autor

- [ ] En `src/pages/autor/[autor].astro` la biografía se toma de la variable `AUTOR_BIO`. Rellénala en `.env` con una línea real sobre tu experiencia.
- [ ] (Opcional) Añade una foto tuya en `public/imagenes/` y enlázala si quieres mostrarla.

---

## 8. Google Search Console (que Google te encuentre)

- [ ] Entra en Search Console y añade tu dominio (**Añadir propiedad → Dominio**).
- [ ] Verifica la propiedad (normalmente con un registro **TXT** en el DNS; Search Console te lo indica).
- [ ] Una vez verificado, en **Sitemaps** envía:
  - `https://TU-DOMINIO/sitemap.xml`
  - `https://TU-DOMINIO/sitemap-news.xml`

---

## 9. Google Analytics 4 (medir visitas)

- [ ] En Analytics crea una **propiedad** para tu web.
- [ ] Copia el **ID de medición** (tipo `G-XXXXXXXXXX`).
- [ ] Ponlo en la variable `GA4_ID` (en `.env` y en las variables del hosting).
- [ ] *(No carga nada hasta que el visitante acepta las cookies.)*

---

## 10. Rutina diaria de revisión (10–15 min)

Mientras `REVISION_HUMANA=true`, cada edición llega como un *pull request* (una propuesta de cambios que tú apruebas).

- [ ] En GitHub, pestaña **Pull requests**, abre el del día.
- [ ] En **Files changed** lee los artículos nuevos.
- [ ] Revisa: ¿los **datos** están bien y con fuente?, ¿el **titular** cumple lo que dice el texto?, ¿hay algo raro o sensible?
- [ ] Si quieres cambiar algo, edítalo ahí mismo (botón del lápiz) o pídeselo a Claude Code.
- [ ] Cuando esté bien, pulsa **Merge pull request**. La web se actualiza sola.

---

## 11. Solicitar AdSense

**Cuándo:** cuando tengas **unos 25–30 artículos de calidad**, todas las páginas legales y unas semanas de antigüedad del dominio. (Google no publica un mínimo oficial; la revisión puede tardar de días a semanas.) Ya tienes 7 artículos de base; sigue publicando antes de solicitarlo.

- [ ] En adsense.google.com, **date de alta** y añade tu sitio.
- [ ] Copia tu **ID de cliente** (`pub-XXXXXXXXXXXXXXXX`).
- [ ] Pégalo en la variable `ADSENSE_CLIENT_ID` y pon `ADSENSE_ACTIVO=true`.
- [ ] Edita `public/ads.txt` y sustituye `pub-XXXXXXXXXXXXXXXX` por tu ID real.
- [ ] **Consentimiento (CMP):** en la UE, Google exige un gestor de consentimiento certificado (TCF v2.2). Usa el de Google **"Privacidad y mensajes"** desde el panel de AdSense, o pon `CMP_ACTIVO=true` para activar el aviso básico incluido. Los anuncios no se sirven sin consentimiento.
- [ ] **Si te lo rechazan:** lee el motivo, mejora/añade contenido, revisa las páginas legales y vuelve a solicitarlo pasados unos días.

> Mientras AdSense no esté aprobado, no se carga ningún anuncio y el panel muestra los ingresos como **estimación**, no reales.

---

## 12. Cobrar y fiscalidad (orientación, no asesoramiento)

- AdSense paga cuando superas un **umbral mínimo** y tras verificar tu identidad y una dirección de pago.
- Los ingresos **se declaran en España**. Como Google factura desde **Irlanda**, lo habitual es tener que darse de alta en Hacienda y en el **Registro de Operadores Intracomunitarios (ROI)** y presentar modelos informativos.
- [ ] **Consulta con un gestor o asesor fiscal antes de cobrar.** Esto es solo orientación, no asesoramiento definitivo.

---

## 12 bis. Conectar el panel de control

- [ ] Asegúrate de que el repositorio es **privado**.
- [ ] En **Google Cloud** (console.cloud.google.com) crea un **proyecto** y activa estas APIs: **Google Analytics Data API**, **Search Console API** y **AdSense Management API**.
- [ ] Crea una **cuenta de servicio** (*una especie de usuario robot*): **IAM y administración → Cuentas de servicio → Crear**. Genera una **clave JSON** y descárgala.
- [ ] Dale acceso de **lectura**:
  - En Analytics: **Administrar → Acceso a la propiedad**, añade el email de la cuenta de servicio como **lector**.
  - En Search Console: **Configuración → Usuarios y permisos**, añade ese email como **lector**.
- [ ] Guarda el contenido del JSON en el secret `GOOGLE_SERVICE_ACCOUNT_JSON` y pon `GA4_PROPERTY_ID` y `SEARCH_CONSOLE_SITE_URL`.
- [ ] **AdSense** (no admite cuenta de servicio): crea credenciales **OAuth** en Google Cloud y obtén un **refresh token**. Guarda `ADSENSE_OAUTH_CLIENT_ID`, `ADSENSE_OAUTH_CLIENT_SECRET`, `ADSENSE_REFRESH_TOKEN` y `ADSENSE_ACCOUNT_ID`.
- [ ] Despliega el **panel** como **proyecto aparte** en Cloudflare Pages (**Build:** `npm run panel:build`, **Output:** `panel/dist`) y protégelo con **Cloudflare Access** (Zero Trust → Access → Applications), permitiendo solo tu email.
- [ ] Rellena `datos/costes_fijos.yaml` con tus costes reales (dominio, hosting, etc.).
- [ ] Configura alertas: pon `ALERTAS_EMAIL` o `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`.

**Cómo leer el panel (ejemplo):** si en un mes tienes **100.000 páginas vistas** y un **RPM** (ingresos por cada 1.000 páginas vistas) de **4 €**, los ingresos estimados son 100.000 ÷ 1.000 × 4 = **400 €**. Si tus costes (IA + fijos) son **120 €**, tu **beneficio** es 280 € y tu **margen** 70 %. El **punto de equilibrio** sería 120 ÷ 4 × 1.000 = **30.000 páginas vistas/mes**.

> Mientras no haya credenciales, cada bloque del panel muestra "Pendiente de conectar". Para verlo completo con datos de ejemplo: `npm run panel -- --demo`.

---

## 13. Pasar a piloto automático

- [ ] Cuando lleves semanas revisando y la calidad sea constante, cambia `REVISION_HUMANA` a `false`. Entonces el sistema publica directo a `main` sin pull request.
- [ ] Conviene esperar: la revisión humana al principio evita errores y protege tu posicionamiento y tu cuenta de AdSense.

---

## 14. Qué hacer si algo falla

- **Ver los registros:** en GitHub, pestaña **Actions**, abre la ejecución que falló y lee el log.
- **Errores típicos:**
  - *Clave caducada o sin saldo*: revisa `ANTHROPIC_API_KEY` y tu límite de gasto en Anthropic.
  - *Presupuesto alcanzado*: el sistema se detiene solo; sube `PRESUPUESTO_DIARIO_USD` si procede.
  - *Fuente caída*: el pipeline la ignora y sigue; no hay que hacer nada.
- **Pedir ayuda a Claude Code**, frase de ejemplo para pegar:

  > "El workflow *Redacción diaria* ha fallado con este error: [pega el error del log]. Revísalo y arréglalo, por favor."

---

## 15. Costes mensuales y calendario de las 8 primeras semanas

**Costes estimados (orientativos):**

| Concepto | Coste |
|---|---|
| Dominio `.es` | ~12 €/año (~1 €/mes) |
| Hosting (Cloudflare Pages / Vercel) | 0 € |
| IA (Anthropic) | Según uso; tope sugerido 3 $/día (~90 $/mes máx., normalmente menos) |
| Newsletter / herramientas | 0 € al principio |

**Calendario sugerido:**

- **Semana 1:** cuentas (paso 1), subir a GitHub (2-3), publicar la web (4), dominio (5), datos legales (6-7).
- **Semana 2:** Search Console y Analytics (8-9); empieza la rutina diaria de revisión (10).
- **Semanas 3-5:** publica a diario; llega a 25-30 artículos; afina prompts si hace falta.
- **Semana 6:** solicita AdSense (11); configura el CMP.
- **Semana 7:** conecta el panel y las métricas (12 bis); revisa finanzas.
- **Semana 8:** valora pasar (o no) a piloto automático (13); habla con un gestor sobre fiscalidad (12).

---

_Dudas técnicas puntuales: pídeselas a Claude Code describiendo qué quieres. Para decisiones legales o fiscales, consulta a un profesional._
