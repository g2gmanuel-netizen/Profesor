# Ruta a la monetización real y rentable — Bolsillo Diario

Plan de ruta honesto para llevar este proyecto de "construido" a "rentable". Mezcla
objetivos, números y decisiones. Los importes son **estimaciones con rangos**, no promesas:
el resultado real depende del tráfico, del nicho y de Google. Las cifras de coste de IA salen
del contador del propio sistema (`datos/costes.json`); las de ingresos, de supuestos que debes
ajustar en `datos/supuestos.yaml` a medida que tengas datos reales.

> Regla de oro de este plan: **AdSense es el suelo, no el techo.** En economía personal, el
> dinero bueno está en la afiliación (comparadores de hipotecas, depósitos, luz, seguros) y en
> el lead-gen, no en el banner. El plan trata AdSense como validación y colchón, y construye el
> negocio sobre fuentes de mayor valor por visita.

---

## 1. La verdad sobre las cifras (unit economics)

### Lo que cuesta producir
Con el pipeline actual y revisión humana:

| Partida | Estimación |
|---|---|
| Coste IA por artículo (modelo potente, ~6 agentes con LLM) | **0,05–0,30 $** según modelo |
| Con `MODELO_REDACCION=claude-sonnet-5-5` (recomendado para volumen) | extremo bajo del rango |
| Con Opus | extremo alto |
| Hosting + dominio | ~1 €/mes (fijo) |
| Tu tiempo de revisión | 10–15 min/día (el coste oculto real) |

**Conclusión:** el coste marginal por artículo es casi despreciable (céntimos). El cuello de
botella no es el coste, es **la calidad y el tráfico**. Por eso el plan NO es "publicar más",
es "publicar lo que Google premia y la gente busca".

### Lo que ingresa
RPM = ingresos por cada 1.000 páginas vistas. En contenido de **finanzas personales en España**
el RPM de AdSense suele ser **alto para los estándares de medios** (el nicho tiene anunciantes
que pujan), con rangos orientativos de **4–12 € RPM** una vez indexado y con tráfico de calidad;
puede ser menor al principio y mayor en meses de campaña (renta, Black Friday financiero).

### El número que manda: punto de equilibrio
El panel lo calcula solo (pantalla Finanzas). Con costes ~5 €/mes y RPM 5 €:

> punto de equilibrio ≈ (5 € ÷ 5 €) × 1.000 = **1.000 páginas vistas/mes** para cubrir costes.

Es decir: **cubrir costes es trivial**; el reto es que esas páginas vistas se conviertan en un
ingreso que **pague tu tiempo** y deje beneficio. Para eso hacen falta ~decenas de miles de
visitas/mes y, sobre todo, **diversificar ingresos** (sección 4).

---

## 2. Las 3 barreras reales (y cómo las aborda el sistema)

1. **Aprobación de AdSense.** Google rechaza "contenido de poco valor" y "contenido escalado
   con IA". *Mitigación ya construida:* fuentes primarias obligatorias, verificador anti-invención,
   revisor de cumplimiento, páginas legales, autor real, aviso de uso de IA. *Lo que te toca:*
   25–30 artículos buenos, dominio con unas semanas de vida, y **un autor humano real con cara y
   biografía** (E-E-A-T — Google valora experiencia demostrable en temas de dinero: "YMYL").
2. **Tráfico (Google te tiene que mandar gente).** Dos motores: **Search** (consultas de servicio:
   "cómo pedir la ayuda al alquiler", "requisitos jubilación") y **Discover** (feed móvil, muy
   volátil pero de gran volumen). *Mitigación:* SEO técnico ≥90 Lighthouse, datos estructurados
   `NewsArticle`, sitemap de noticias, titulares honestos (la actualización anti-clickbait de
   Discover penaliza lo contrario).
3. **Volatilidad de Google.** Un *core update* o un bandazo de Discover puede hundir el tráfico
   de un día para otro. *Mitigación:* no depender solo de Google → **newsletter** (audiencia
   propia) y **evergreen** (tráfico estable de búsqueda) además de la noticia.

---

## 3. Plan por fases (con KPIs y puertas de decisión)

Cada fase tiene una **puerta**: no pases a la siguiente sin cumplir el KPI.

### Fase A — Fundación (semanas 1–4)
- **Objetivo:** sitio desplegado, indexado y con base de contenido.
- **Acciones:** desplegar (guía pasos 1–5), Search Console + sitemaps (paso 8), autor real (paso 7),
  publicar hasta llegar a **25–30 artículos** (mezcla 60% evergreen de servicio / 40% noticia).
- **KPI puerta:** sitio indexado en Search Console + 25 artículos + 0 errores de cobertura.

### Fase B — AdSense y primeras visitas (semanas 4–10)
- **Objetivo:** aprobar AdSense y validar que hay demanda.
- **Acciones:** solicitar AdSense (paso 11), activar CMP, GA4. Seguir publicando 3/día.
  Vigilar en Search Console qué consultas traen clics y **doblar la apuesta en esos temas**.
- **KPI puerta:** AdSense aprobado + **≥10.000 páginas vistas/mes** + se identifican 5–10
  consultas "ganadoras".

### Fase C — Crecimiento y aprendizaje (meses 3–6)
- **Objetivo:** convertir señales en sistema.
- **Acciones:** el analista semanal ya reescribe `aprendizajes.md`; úsalo. Crea *clusters*
  de contenido alrededor de cada consulta ganadora (pilar + artículos satélite enlazados).
  Lanza la **newsletter** (audiencia propia). Mete los primeros **enlaces de afiliación**
  (sección 4) en los artículos de servicio.
- **KPI puerta:** **≥50.000 páginas vistas/mes** + newsletter con base inicial + primer euro de
  afiliación.

### Fase D — Rentabilidad y diversificación (meses 6–12)
- **Objetivo:** que el margen pague tu tiempo y deje beneficio.
- **Acciones:** optimizar RPM (ubicación de anuncios, *auto ads* con moderación), escalar
  afiliación en los verticales de mayor valor, valorar publicación semiautomática
  (`REVISION_HUMANA=false`) solo si la calidad es constante.
- **KPI puerta:** **beneficio mensual positivo y creciente** 3 meses seguidos (lo ves en la
  pantalla Finanzas del panel).

---

## 4. Diversificación de ingresos (aquí está la rentabilidad)

Ordenado por valor por visita, de mayor a menor:

1. **Afiliación / comparadores (lo más rentable en este nicho).** Hipotecas, depósitos y cuentas
   remuneradas, seguros, luz y gas, *brokers*. Programas: redes de afiliación bancaria, comparadores
   con programa propio, Amazon (para libros/productos de finanzas personales). Una sola conversión de
   hipoteca puede valer más que miles de páginas vistas de banner.
   - *Cómo encaja en el sistema:* añade a cada artículo de servicio un bloque "Compara" con enlaces
     de afiliación **marcados como tales** (transparencia = requisito legal y de confianza). Ya tienes
     artículos idóneos (depósitos, hipotecas, luz).
2. **Lead-gen.** Captar solicitudes (p. ej. "calcula tu hipoteca") y derivarlas a un partner por CPL.
   Mayor complejidad legal (RGPD, consentimiento), mayor valor.
3. **Newsletter patrocinada.** Cuando tengas base propia, un patrocinador por envío. Ingreso estable
   e independiente de Google.
4. **AdSense / display.** El suelo. Fácil, pasivo, pero bajo valor por visita. No lo optimices en
   exceso a costa de la experiencia (perjudica SEO y Discover).
5. **Contenido premium / productos propios** (guías descargables, calculadoras). Largo plazo.

> **Regla de mezcla:** en un artículo de servicio bien posicionado, el ingreso de afiliación puede
> superar 5–10× al de AdSense para el mismo tráfico. Prioriza crear y posicionar esos.

---

## 5. Palancas de coste (mantener el margen alto)

- **Modelo adecuado por tarea** (ya implementado): Haiku para clasificar/filtrar, modelo potente
  solo para investigar/redactar/verificar. Para volumen, **`MODELO_REDACCION=claude-sonnet-5-5`**
  da la mejor relación calidad/precio (≈2 $/10 $ por millón de tokens frente a 5 $/25 $ de Opus).
- **Presupuesto diario** (`PRESUPUESTO_DIARIO_USD`): el sistema se detiene solo. Súbelo solo si el
  ROI lo justifica.
- **Caché de prompts**: si subes el volumen, cachear el prompt de sistema de cada agente reduce el
  coste de entrada. (Mejora futura; hoy los prompts son pequeños y no compensa.)
- **Lotes (Batch API)**: para los 10 evergreen iniciales o reprocesados, la Batch API cuesta la
  mitad. (Mejora futura, opcional.)

---

## 6. Qué construir a continuación (backlog priorizado)

Mejoras de producto que mueven la aguja, en orden de impacto:

1. **Bloque de afiliación configurable** en los artículos de servicio (componente `<Comparador>`
   con enlaces marcados `rel="sponsored"`). *Impacto: ingresos.*
2. **Calculadoras interactivas** (cuota de hipoteca, ahorro, IRPF). Imán de enlaces y de tráfico
   recurrente; perfectas para captar afiliación/lead. *Impacto: tráfico + ingresos.*
3. **Clusters de contenido**: que el Editor jefe planifique pilar + satélites por tema ganador,
   leyendo `aprendizajes.md`. *Impacto: SEO.*
4. **Newsletter real** (conectar proveedor en `NEWSLETTER_ACTION_URL` + captación con imán).
   *Impacto: audiencia propia, anti-volatilidad.*
5. **Caché de prompts + Batch** para evergreen. *Impacto: coste.*
6. **Página de "Metodología"/"Cómo verificamos"** enlazada desde cada artículo. *Impacto: E-E-A-T,
   aprobación AdSense.*

---

## 7. Escenarios a 12 meses (ilustrativos, no promesas)

Supuestos: coste casi fijo (~5 €/mes + tu tiempo). Beneficio = ingresos − costes.

| Escenario | Páginas vistas/mes | RPM AdSense | Afiliación/mes | Ingreso total/mes aprox. |
|---|---|---|---|---|
| **Conservador** | 30.000 | 4 € | 50 € | ~170 € |
| **Base** | 100.000 | 6 € | 300 € | ~900 € |
| **Optimista** | 300.000 | 8 € | 1.500 € | ~3.900 € |

Lecciones de la tabla:
- Con solo AdSense, incluso el escenario optimista da ~2.400 €/mes: **decente, no transformador**.
- La **afiliación** es la que cambia el perfil del negocio. Por eso es la prioridad nº 1 del backlog.
- El salto de conservador a base es, sobre todo, **SEO y constancia**, no gastar más en IA.

---

## 8. Riesgos y cómo vigilarlos (desde el panel)

| Riesgo | Señal temprana (pantalla Alertas) | Respuesta |
|---|---|---|
| Rechazo o suspensión de AdSense | — (correo de Google) | Revisar motivo, mejorar contenido/legales, resolicitar |
| *Core update* que hunde tráfico | Caída >30% semana vs semana | No tocar nada 2 semanas; revisar E-E-A-T y calidad; diversificar |
| Volatilidad de Discover | Caída del peso de Discover | Reforzar tráfico de búsqueda (evergreen) y newsletter |
| Escrutinio de contenido IA | Caída de posiciones + avisos | Más valor añadido humano, datos propios, autor visible |
| Coste de IA se dispara | Alerta de presupuesto | Bajar a Sonnet/Haiku, reducir vueltas, Batch |
| Dependencia de una sola fuente | — | Mantener ≥2 fuentes de ingreso y la newsletter |

---

## 9. Lo primero que harías mañana (resumen accionable)

1. Desplegar y conseguir que Google indexe (guía, pasos 1–8).
2. Poner **tu cara y tu biografía reales** como autor (E-E-A-T; crítico en temas de dinero).
3. Llegar a 25–30 artículos buenos; 60% evergreen de servicio.
4. Solicitar AdSense y, **en paralelo**, dar de alta 1–2 programas de **afiliación** y añadir el
   bloque comparador a los artículos de servicio.
5. Lanzar la newsletter desde el día 1 para empezar a construir audiencia propia.
6. Cada lunes, leer `aprendizajes.md` y la pantalla Finanzas del panel, y doblar la apuesta en lo
   que funciona.

> Para asesoramiento fiscal (cómo declarar los ingresos, alta en Hacienda, ROI intracomunitario por
> facturar Google desde Irlanda), **consulta con un gestor** antes de cobrar. Ver `GUIA_PASOS_MANUALES.md`, paso 12.
