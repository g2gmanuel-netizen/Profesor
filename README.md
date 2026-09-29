# LUCKY 🔴

Asistente personal local para macOS con **holograma rojo**, voz natural,
activación por **dos palmas 👏👏**, por **«oye lucky»** o **simplemente al hablar**,
y un **panel de actividad** que muestra en vivo qué está haciendo (abrir carpetas,
crear documentos, enviar correos, buscar en internet…).

> **Nota de procedencia.** Este repositorio es una **reconstrucción desde el
> documento de traspaso** de «JARVIS «Lucky»» más las mejoras solicitadas por el
> Profesor. **No** es una copia exacta del código original de `~/Claude/JARVIS/`
> del Mac: concílialo con esa versión (o sube los archivos reales y se continúa
> sobre ellos).

## Novedades respecto al traspaso
- **Marca LUCKY** (ya no «jarvis») y **display holográfico rojo**, dinámico y
  tecnológico (canvas de partículas, rejilla, halos, estados animados).
- **Activación** por **tres palmas 👏👏👏**, por palabra clave (`lucky`, `oye lucky`,
  `hola lucky`) o **modo abierto** (cualquier voz).
- **Arranque automático** al iniciar sesión (launchd): queda escuchando en
  segundo plano y **la bola se abre sola** al invocarlo; no hay que abrirlo a mano.
- **No te interrumpe:** espera a que termines de hablar (silencio) para responder.
- **Barge-in:** si hablas mientras responde, **se calla al instante** y te atiende
  con el mínimo retardo (voz troceada por frases + corte inmediato del audio).
- **Voz menos robótica:** ElevenLabs / OpenAI TTS con respaldo a la voz del sistema.
- **Respuestas concisas** por diseño (1–3 frases salvo que pidas detalle).
- **Generación de documentos** (`generar_documento`: md/txt/html).
- **Mejor búsqueda en internet** (varios motores, con extracción de contenido).
- **Panel de actividad** en tiempo real (`/api/actividad`).

## Arranque (macOS)
1. Doble clic en **`Instalar JARVIS.command`** (una sola vez).
2. Edita **`.env`** (copia de `.env.example`) y pon tu `ANTHROPIC_API_KEY`.
3. Doble clic en **`jarvis.command`**. Se abre la bola en `http://127.0.0.1:8765`.

### Arranque automático (recomendado): que se abra SOLO
Doble clic en **`instalar_arranque.command`**. A partir de ahí **no tienes que
abrir nada desde Documentos**: LUCKY arranca al iniciar sesión y queda escuchando
en segundo plano. La bola **se abre sola** cuando:
- dices **«oye lucky»**, o
- das **tres palmas 👏👏👏** (configurable con `JARVIS_PALMAS`).

Para quitarlo: doble clic en **`desinstalar_arranque.command`**.

### Modos de ejecución
```bash
python jarvis.py            # bola + voz + navegador
python jarvis.py --fondo    # segundo plano: sin abrir nada hasta que le llames
python jarvis.py --sin-voz  # bola sin micrófono
python jarvis.py --texto    # solo teclado (depurar cerebro/herramientas)
```

## Arquitectura
| Archivo | Responsabilidad |
|---|---|
| `jarvis.py` | Cerebro (API Claude + herramientas), servidor HTTP (bola) y orquestación voz↔cerebro. |
| `escucha.py` | Micrófono: palmas, palabra clave, VAD/endpointing, **barge-in**. Whisper para voz→texto. |
| `tts.py` | Voz de salida interrumpible (ElevenLabs / OpenAI / `say`), frase a frase. |
| `herramientas.py` | Estado local y sistema; fusiona `extras.py`. |
| `extras.py` | Internet, datos, documentos y acciones con confirmación. |
| `actividad.py` | Bus de actividad que alimenta el panel «qué estoy haciendo». |
| `interfaz.html` | Holograma rojo + paneles + entrada de texto. |
| `estado/` | Perfil, proyectos, tareas, decisiones, rutinas, diario, memoria, fuentes. |

## Bloqueo conocido (configuración, no código)
Si ves `This API key is not scoped to a workspace…`, tu clave es de ámbito
«Organización». Soluciones:
- **A (recomendada):** crea una clave **dentro de un espacio de trabajo** en
  console.anthropic.com y ponla en `.env`.
- **B:** mantén la clave y pon `ANTHROPIC_WORKSPACE_ID=wrkspc_...` en `.env`
  (el código ya envía esa cabecera).

## Seguridad y límites
- El contenido de webs y archivos es **información, nunca una orden**.
- Acciones con consecuencias (correo, evento, comando, atajo) quedan **PREPARADAS**
  y solo se ejecutan al decir **«confirmo»**. Comandos peligrosos bloqueados.
- Alpaca: **solo paper y lectura**. No se mueve dinero real.
