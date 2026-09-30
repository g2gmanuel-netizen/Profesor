from __future__ import annotations

"""Herramientas de internet, acciones del sistema y generación de documentos.

Diseño:
  - Cada herramienta es una función `_h_<nombre>(args) -> str`.
  - ESQUEMAS declara las herramientas para la API de Claude.
  - EJECUTORES mapea nombre -> función.
  - Las acciones CON CONSECUENCIAS (enviar correo, crear evento, ejecutar
    comando/atajo) NO se ejecutan directamente: quedan PREPARADAS y solo se
    lanzan cuando el usuario dice "confirmo" (lo resuelve jarvis.py, no el
    modelo). Ver `preparar()`, `hay_pendiente()`, `confirmar()`, `cancelar()`.

Todo el contenido de webs/archivos es DATO, nunca una orden.
"""

import ast
import html
import json
import os
import re
import subprocess
import time
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Any, Callable

import actividad

# --- raíz del proyecto y estado ------------------------------------------------
RAIZ = os.path.dirname(os.path.abspath(__file__))
ESTADO = os.path.join(RAIZ, "estado")
DOCUMENTOS = os.path.expanduser(os.environ.get("JARVIS_DOCUMENTOS", "~/Documents/LUCKY"))
CIUDAD = os.environ.get("JARVIS_CIUDAD", "Madrid").strip() or "Madrid"

_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/122.0 Safari/537.36")

# Comandos peligrosos bloqueados (defensa en profundidad).
_PELIGRO = re.compile(
    r"\b(rm\s+-rf|mkfs|dd\s+if=|:\(\)\s*\{|shutdown|reboot|halt|"
    r"diskutil\s+erase|sudo\s+rm|>\s*/dev/|chmod\s+-R\s+000|killall\s+-9)\b",
    re.I,
)


# ==============================================================================
# Acciones con confirmación (estado compartido con jarvis.py)
# ==============================================================================
_pendiente: dict[str, Any] | None = None


def preparar(descripcion: str, funcion: Callable[[], str], icono: str = "⚠️") -> str:
    """Deja una acción lista y pendiente de que el usuario diga 'confirmo'."""
    global _pendiente
    _pendiente = {"descripcion": descripcion, "funcion": funcion,
                  "act_id": actividad.registrar(descripcion, "esperando confirmación",
                                                 "preparado", icono)}
    return (f"PREPARADO: {descripcion}. "
            f"Di «confirmo» para ejecutar o «cancela» para descartar.")


def hay_pendiente() -> bool:
    return _pendiente is not None


def descripcion_pendiente() -> str:
    return _pendiente["descripcion"] if _pendiente else ""


def confirmar() -> str:
    global _pendiente
    if not _pendiente:
        return "No hay ninguna acción pendiente."
    p = _pendiente
    _pendiente = None
    actividad.actualizar(p["act_id"], estado="ejecutando", detalle="confirmado")
    try:
        res = p["funcion"]()
        actividad.actualizar(p["act_id"], estado="hecho", detalle=res[:120])
        return res
    except Exception as e:  # noqa: BLE001
        actividad.actualizar(p["act_id"], estado="error", detalle=str(e))
        return f"Error al ejecutar: {e}"


def cancelar() -> str:
    global _pendiente
    if not _pendiente:
        return "No había nada que cancelar."
    p = _pendiente
    _pendiente = None
    actividad.actualizar(p["act_id"], estado="error", detalle="cancelado por el usuario")
    return f"Cancelado: {p['descripcion']}."


# ==============================================================================
# Utilidades HTTP
# ==============================================================================
class LimiteError(Exception):
    """La web limita las peticiones (HTTP 429)."""


def _get(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": _UA,
                                               "Accept-Language": "es-ES,es;q=0.9,en;q=0.6"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            datos = r.read()
            enc = r.headers.get_content_charset() or "utf-8"
        return datos.decode(enc, errors="replace")
    except urllib.error.HTTPError as e:
        if e.code == 429:
            raise LimiteError("429")
        raise


def _texto_plano(htmltxt: str, limite: int = 4000) -> str:
    t = re.sub(r"(?is)<(script|style|noscript|template).*?</\1>", " ", htmltxt)
    t = re.sub(r"(?s)<[^>]+>", " ", t)
    t = html.unescape(t)
    t = re.sub(r"[ \t\r\f\v]+", " ", t)
    t = re.sub(r"\n\s*\n+", "\n\n", t)
    t = t.strip()
    return t[:limite]


# ==============================================================================
# INTERNET — búsqueda mejorada (varios motores, con extracción de contenido)
# ==============================================================================
def _h_buscar_web(args: dict) -> str:
    consulta = (args.get("consulta") or "").strip()
    n = int(args.get("resultados") or 5)
    if not consulta:
        return "Falta la consulta."
    with actividad.accion("Buscando en internet", consulta, icono="🔎"):
        resultados = (_buscar_ddg(consulta, n) or _buscar_ddg_lite(consulta, n)
                      or _buscar_bing(consulta, n))
    if not resultados:
        return (f"No pude buscar «{consulta}» ahora mismo (los buscadores no "
                f"respondieron). Puedo intentar leer una web concreta si me pasas la URL.")
    lineas = [f"Resultados para «{consulta}»:"]
    for i, r in enumerate(resultados, 1):
        lineas.append(f"{i}. {r['titulo']}\n   {r['url']}\n   {r['fragmento']}")
    return "\n".join(lineas)


def _buscar_ddg(consulta: str, n: int) -> list[dict]:
    try:
        url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(consulta)
        pagina = _get(url)
        res = []
        for m in re.finditer(
            r'result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>.*?result__snippet[^>]*>(.*?)</a>',
            pagina, re.S,
        ):
            enlace = urllib.parse.unquote(re.sub(r".*uddg=", "", m.group(1)))
            enlace = enlace.split("&rut=")[0]
            res.append({
                "titulo": _texto_plano(m.group(2), 200),
                "url": html.unescape(enlace),
                "fragmento": _texto_plano(m.group(3), 300),
            })
            if len(res) >= n:
                break
        return res
    except Exception:
        return []


def _buscar_ddg_lite(consulta: str, n: int) -> list[dict]:
    try:
        url = "https://lite.duckduckgo.com/lite/?q=" + urllib.parse.quote(consulta)
        pagina = _get(url)
        res = []
        for m in re.finditer(r'<a[^>]*class="result-link"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
                             pagina, re.S):
            res.append({"titulo": _texto_plano(m.group(2), 200),
                        "url": html.unescape(m.group(1)), "fragmento": ""})
            if len(res) >= n:
                break
        return res
    except Exception:
        return []


def _buscar_bing(consulta: str, n: int) -> list[dict]:
    try:
        url = "https://www.bing.com/search?q=" + urllib.parse.quote(consulta)
        pagina = _get(url)
        res = []
        for m in re.finditer(r'<li class="b_algo".*?<h2>.*?<a href="([^"]+)".*?>(.*?)</a>.*?</h2>(.*?)</li>',
                             pagina, re.S):
            frag = re.search(r'<p[^>]*>(.*?)</p>', m.group(3), re.S)
            res.append({
                "titulo": _texto_plano(m.group(2), 200),
                "url": html.unescape(m.group(1)),
                "fragmento": _texto_plano(frag.group(1), 300) if frag else "",
            })
            if len(res) >= n:
                break
        return res
    except Exception:
        return []


def _h_buscar_noticias_web(args: dict) -> str:
    consulta = (args.get("consulta") or "").strip()
    if not consulta:
        return "Falta la consulta."
    with actividad.accion("Buscando noticias", consulta, icono="📰"):
        url = ("https://news.google.com/rss/search?hl=es&gl=ES&ceid=ES:es&q="
               + urllib.parse.quote(consulta))
        try:
            xml = _get(url)
        except Exception as e:  # noqa: BLE001
            return f"No pude buscar noticias: {e}"
    items = re.findall(r"<item>(.*?)</item>", xml, re.S)[:6]
    if not items:
        return f"Sin noticias para «{consulta}»."
    out = [f"Noticias sobre «{consulta}»:"]
    for it in items:
        tit = re.search(r"<title>(.*?)</title>", it, re.S)
        fecha = re.search(r"<pubDate>(.*?)</pubDate>", it, re.S)
        out.append(f"• {_texto_plano(tit.group(1), 160) if tit else '¿?'}"
                   + (f"  ({fecha.group(1)[:16]})" if fecha else ""))
    return "\n".join(out)


def _h_leer_url(args: dict) -> str:
    url = (args.get("url") or "").strip()
    if not url.startswith(("http://", "https://")):
        return "URL no válida."
    with actividad.accion("Leyendo página", url, icono="🌐"):
        try:
            pagina = _get(url)
        except Exception as e:  # noqa: BLE001
            return f"No pude abrir la URL: {e}"
    titulo = re.search(r"<title[^>]*>(.*?)</title>", pagina, re.S | re.I)
    cuerpo = _texto_plano(pagina, 6000)
    cab = _texto_plano(titulo.group(1), 200) if titulo else url
    return f"{cab}\n\n{cuerpo}"


def _h_noticias(args: dict) -> str:
    ruta = os.path.join(ESTADO, "fuentes-noticias.md")
    fuentes = []
    if os.path.exists(ruta):
        with open(ruta, encoding="utf-8") as f:
            for linea in f:
                m = re.search(r"(https?://\S+)", linea)
                if m:
                    fuentes.append(m.group(1))
    if not fuentes:
        fuentes = ["https://www.eldiario.es/rss/",
                   "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada"]
    titulares: list[str] = []
    with actividad.accion("Revisando titulares", f"{len(fuentes)} fuentes", icono="🗞️"):
        for url in fuentes[:6]:
            try:
                xml = _get(url, timeout=15)
            except Exception:
                continue
            for it in re.findall(r"<item>(.*?)</item>", xml, re.S)[:3]:
                t = re.search(r"<title>(.*?)</title>", it, re.S)
                if t:
                    titulares.append("• " + _texto_plano(t.group(1), 160))
    return "\n".join(titulares[:15]) if titulares else "No pude recuperar titulares."


# ==============================================================================
# DATOS — tiempo, mercado, wikipedia, cálculo
# ==============================================================================
def _h_tiempo(args: dict) -> str:
    ciudad = (args.get("ciudad") or CIUDAD).strip()
    with actividad.accion("Consultando el tiempo", ciudad, icono="⛅"):
        try:
            geo = json.loads(_get(
                "https://geocoding-api.open-meteo.com/v1/search?count=1&language=es&name="
                + urllib.parse.quote(ciudad)))
            if not geo.get("results"):
                return f"No encuentro «{ciudad}»."
            g = geo["results"][0]
            met = json.loads(_get(
                f"https://api.open-meteo.com/v1/forecast?latitude={g['latitude']}"
                f"&longitude={g['longitude']}&current=temperature_2m,relative_humidity_2m,"
                f"wind_speed_10m,weather_code&timezone=auto"))
            c = met["current"]
        except Exception as e:  # noqa: BLE001
            return f"No pude consultar el tiempo: {e}"
    return (f"{g['name']}: {c['temperature_2m']}°C, humedad {c['relative_humidity_2m']}%, "
            f"viento {c['wind_speed_10m']} km/h.")


_cache_cotiz: dict[str, tuple[float, str]] = {}


def _h_cotizacion(args: dict) -> str:
    simbolo = (args.get("simbolo") or "").strip().upper()
    if not simbolo:
        return "Falta el símbolo (p. ej. AAPL, ^IBEX, EURUSD=X)."
    # cache de 60 s: evita machacar Yahoo si se pide lo mismo repetidamente
    ahora = time.time()
    if simbolo in _cache_cotiz and ahora - _cache_cotiz[simbolo][0] < 60:
        return _cache_cotiz[simbolo][1]
    with actividad.accion("Consultando cotización", simbolo, icono="📈"):
        try:
            d = json.loads(_get(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(simbolo)}"))
            r = d["chart"]["result"][0]["meta"]
        except LimiteError:
            return ("Yahoo Finance está limitando las peticiones (429). "
                    "Espera un par de minutos; no voy a reintentar ahora.")
        except Exception as e:  # noqa: BLE001
            return f"No pude obtener la cotización de {simbolo}: {e}"
    precio = r.get("regularMarketPrice")
    prev = r.get("chartPreviousClose") or r.get("previousClose")
    var = ""
    if precio and prev:
        pct = (precio - prev) / prev * 100
        var = f" ({pct:+.2f}%)"
    salida = f"{simbolo}: {precio} {r.get('currency', '')}{var}"
    _cache_cotiz[simbolo] = (time.time(), salida)
    return salida


def _h_resumen_mercado(args: dict) -> str:
    indices = {"IBEX 35": "^IBEX", "S&P 500": "^GSPC", "Nasdaq": "^IXIC",
               "EUR/USD": "EURUSD=X", "Brent": "BZ=F", "Bitcoin": "BTC-USD"}
    out = ["Resumen de mercado:"]
    with actividad.accion("Resumen de mercado", ", ".join(indices), icono="💹"):
        for nombre, sim in indices.items():
            out.append("• " + nombre + ": " +
                       _h_cotizacion({"simbolo": sim}).split(": ", 1)[-1])
    return "\n".join(out)


def _h_convertir_divisa(args: dict) -> str:
    origen = (args.get("origen") or "EUR").upper()
    destino = (args.get("destino") or "USD").upper()
    cantidad = float(args.get("cantidad") or 1)
    sim = f"{origen}{destino}=X"
    r = _h_cotizacion({"simbolo": sim})
    m = re.search(r":\s*([\d.]+)", r)
    if not m:
        return f"No pude convertir {origen}->{destino}."
    tasa = float(m.group(1))
    return f"{cantidad} {origen} = {cantidad * tasa:.2f} {destino} (tasa {tasa})."


def _h_wikipedia(args: dict) -> str:
    termino = (args.get("termino") or "").strip()
    if not termino:
        return "Falta el término."
    with actividad.accion("Consultando Wikipedia", termino, icono="📚"):
        try:
            d = json.loads(_get(
                "https://es.wikipedia.org/api/rest_v1/page/summary/"
                + urllib.parse.quote(termino.replace(" ", "_"))))
        except Exception as e:  # noqa: BLE001
            return f"No encontré «{termino}»: {e}"
    return d.get("extract") or f"Sin resumen para «{termino}»."


def _h_calcular(args: dict) -> str:
    expr = (args.get("expresion") or "").strip()
    try:
        return f"{expr} = {_eval_seguro(expr)}"
    except Exception as e:  # noqa: BLE001
        return f"No pude calcular «{expr}»: {e}"


_OPS = {ast.Add: lambda a, b: a + b, ast.Sub: lambda a, b: a - b,
        ast.Mult: lambda a, b: a * b, ast.Div: lambda a, b: a / b,
        ast.Pow: lambda a, b: a ** b, ast.Mod: lambda a, b: a % b,
        ast.FloorDiv: lambda a, b: a // b, ast.USub: lambda a: -a,
        ast.UAdd: lambda a: +a}


def _eval_seguro(expr: str) -> float:
    def ev(nodo):
        if isinstance(nodo, ast.Expression):
            return ev(nodo.body)
        if isinstance(nodo, ast.Constant) and isinstance(nodo.value, (int, float)):
            return nodo.value
        if isinstance(nodo, ast.BinOp) and type(nodo.op) in _OPS:
            return _OPS[type(nodo.op)](ev(nodo.left), ev(nodo.right))
        if isinstance(nodo, ast.UnaryOp) and type(nodo.op) in _OPS:
            return _OPS[type(nodo.op)](ev(nodo.operand))
        raise ValueError("expresión no permitida")
    return ev(ast.parse(expr, mode="eval"))


# ==============================================================================
# DOCUMENTOS — generación (nuevo)
# ==============================================================================
def _h_generar_documento(args: dict) -> str:
    titulo = (args.get("titulo") or "documento").strip()
    contenido = args.get("contenido") or ""
    formato = (args.get("formato") or "md").strip().lower()
    if formato not in ("md", "txt", "html", "pdf"):
        formato = "md"
    os.makedirs(DOCUMENTOS, exist_ok=True)
    base = re.sub(r"[^\w\- ]", "", titulo).strip().replace(" ", "_") or "documento"
    marca = datetime.now().strftime("%Y%m%d-%H%M")
    abrir = args.get("abrir", True)   # por defecto, ábrelo para que el Profesor lo vea
    with actividad.accion("Creando documento", f"{base}.{formato}", icono="📄") as a:
        if formato == "pdf":
            # generamos HTML y lo convertimos a PDF con las herramientas de macOS
            ruta_html = os.path.join(DOCUMENTOS, f"{base}_{marca}.html")
            with open(ruta_html, "w", encoding="utf-8") as f:
                f.write(_md_a_html(titulo, contenido))
            ruta = os.path.join(DOCUMENTOS, f"{base}_{marca}.pdf")
            ok = False
            try:
                r = subprocess.run(["cupsfilter", ruta_html], capture_output=True, timeout=30)
                if r.returncode == 0 and r.stdout:
                    with open(ruta, "wb") as f:
                        f.write(r.stdout)
                    ok = True
            except Exception:  # noqa: BLE001
                ok = False
            if not ok:
                ruta = ruta_html   # si no hay cupsfilter, deja el HTML (imprimible a PDF)
        else:
            if formato == "html":
                cuerpo = _md_a_html(titulo, contenido)
            elif formato == "md":
                cuerpo = f"# {titulo}\n\n{contenido}\n"
            else:
                cuerpo = f"{titulo}\n{'=' * len(titulo)}\n\n{contenido}\n"
            ruta = os.path.join(DOCUMENTOS, f"{base}_{marca}.{formato}")
            with open(ruta, "w", encoding="utf-8") as f:
                f.write(cuerpo)
        a.detalle(f"guardado en {ruta}")
        if abrir:
            subprocess.run(["open", ruta], check=False)
    return f"Documento creado: {ruta}"


def _md_a_html(titulo: str, md: str) -> str:
    cuerpo = html.escape(md)
    cuerpo = re.sub(r"^# (.+)$", r"<h1>\1</h1>", cuerpo, flags=re.M)
    cuerpo = re.sub(r"^## (.+)$", r"<h2>\1</h2>", cuerpo, flags=re.M)
    cuerpo = re.sub(r"^### (.+)$", r"<h3>\1</h3>", cuerpo, flags=re.M)
    cuerpo = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", cuerpo)
    cuerpo = re.sub(r"^\- (.+)$", r"<li>\1</li>", cuerpo, flags=re.M)
    cuerpo = cuerpo.replace("\n\n", "</p><p>")
    return (f"<!doctype html><html lang=es><meta charset=utf-8>"
            f"<title>{html.escape(titulo)}</title>"
            f"<style>body{{font-family:-apple-system,Segoe UI,sans-serif;max-width:760px;"
            f"margin:40px auto;padding:0 20px;line-height:1.6;color:#111}}"
            f"h1{{color:#c0202f}}</style><body><p>{cuerpo}</p></body></html>")


# ==============================================================================
# macOS — agenda, recordatorios, portapapeles, archivos, acciones
# ==============================================================================
def _osascript(script: str) -> str:
    try:
        r = subprocess.run(["osascript", "-e", script], capture_output=True,
                           text=True, timeout=20)
        return (r.stdout or r.stderr).strip()
    except Exception as e:  # noqa: BLE001
        return f"(osascript no disponible: {e})"


def _esc(texto: str) -> str:
    """Escapa comillas y barras para meter texto en un literal AppleScript."""
    return (texto or "").replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")


def _h_agenda_hoy(args: dict) -> str:
    with actividad.accion("Leyendo la agenda de hoy", icono="📅"):
        s = ('set hoy to current date\nset out to ""\n'
             'tell application "Calendar"\nrepeat with c in calendars\n'
             'repeat with e in (every event of c whose start date ≥ hoy '
             'and start date ≤ (hoy + 1 * days))\n'
             'set out to out & (summary of e) & " — " & (start date of e as string) & linefeed\n'
             'end repeat\nend repeat\nend tell\nreturn out')
        r = _osascript(s)
    return r or "No hay eventos hoy (o Calendario sin permisos)."


def _h_recordatorios_pendientes(args: dict) -> str:
    with actividad.accion("Leyendo recordatorios", icono="✅"):
        s = ('set out to ""\ntell application "Reminders"\n'
             'repeat with r in (every reminder whose completed is false)\n'
             'set out to out & (name of r) & linefeed\nend repeat\nend tell\nreturn out')
        r = _osascript(s)
    return r or "No hay recordatorios pendientes (o sin permisos)."


def _h_copiar_al_portapapeles(args: dict) -> str:
    texto = args.get("texto") or ""
    with actividad.accion("Copiando al portapapeles", texto[:60], icono="📋"):
        try:
            p = subprocess.Popen(["pbcopy"], stdin=subprocess.PIPE)
            p.communicate(texto.encode("utf-8"))
        except Exception as e:  # noqa: BLE001
            return f"No pude copiar: {e}"
    return "Copiado al portapapeles."


def _h_leer_archivo_texto(args: dict) -> str:
    ruta = os.path.expanduser((args.get("ruta") or "").strip())
    if not os.path.exists(ruta):
        return f"No existe: {ruta}"
    ext = os.path.splitext(ruta)[1].lower()
    with actividad.accion("Leyendo archivo", os.path.basename(ruta), icono="📖"):
        try:
            if ext == ".pdf":
                r = subprocess.run(["pdftotext", ruta, "-"], capture_output=True,
                                   text=True, timeout=30)
                return r.stdout[:6000] or "(PDF sin texto extraíble)"
            with open(ruta, encoding="utf-8", errors="replace") as f:
                return f.read()[:6000]
        except Exception as e:  # noqa: BLE001
            return f"No pude leer el archivo: {e}"


def _h_crear_evento(args: dict) -> str:
    titulo = (args.get("titulo") or "Evento").strip()
    inicio = (args.get("inicio") or "").strip()
    desc = f"Crear evento «{titulo}»" + (f" el {inicio}" if inicio else "")

    def _ejec() -> str:
        s = (f'tell application "Calendar"\ntell calendar 1\n'
             f'make new event with properties {{summary:"{_esc(titulo)}", '
             f'start date:(current date), end date:(current date + 3600)}}\n'
             f'end tell\nend tell\nreturn "creado"')
        return "Evento creado." if "creado" in _osascript(s) else "No pude crear el evento."
    return preparar(desc, _ejec, icono="📅")


def _h_ejecutar_atajo(args: dict) -> str:
    nombre = (args.get("nombre") or "").strip()
    if not nombre:
        return "Falta el nombre del atajo."

    def _ejec() -> str:
        r = subprocess.run(["shortcuts", "run", nombre], capture_output=True, text=True)
        return r.stdout.strip() or f"Atajo «{nombre}» ejecutado."
    return preparar(f"Ejecutar el atajo «{nombre}»", _ejec, icono="⚡")


def _h_ejecutar_comando(args: dict) -> str:
    comando = (args.get("comando") or "").strip()
    if not comando:
        return "Falta el comando."
    if _PELIGRO.search(comando):
        return f"Bloqueado por seguridad: «{comando}» parece peligroso."

    def _ejec() -> str:
        r = subprocess.run(comando, shell=True, capture_output=True, text=True, timeout=60)
        return (r.stdout or r.stderr or "(sin salida)").strip()[:2000]
    return preparar(f"Ejecutar en terminal: {comando}", _ejec, icono="⌨️")


def _h_enviar_correo(args: dict) -> str:
    para = (args.get("para") or "").strip()
    asunto = (args.get("asunto") or "").strip()
    cuerpo = (args.get("cuerpo") or "").strip()
    if not para:
        return "Falta el destinatario."

    def _ejec() -> str:
        s = (f'tell application "Mail"\nset m to make new outgoing message with properties '
             f'{{subject:"{_esc(asunto)}", content:"{_esc(cuerpo)}", visible:true}}\n'
             f'tell m to make new to recipient with properties {{address:"{_esc(para)}"}}\n'
             f'send m\nend tell\nreturn "enviado"')
        return "Correo enviado." if "enviado" in _osascript(s) else "No pude enviar el correo."
    return preparar(f"Enviar correo a {para} — «{asunto}»", _ejec, icono="✉️")


# ==============================================================================
# Sistema — música y volumen (para un asistente "de película")
# ==============================================================================
def _h_control_media(args: dict) -> str:
    accion = (args.get("accion") or "play").strip().lower()
    app = (args.get("app") or "Music").strip()
    if app.lower() in ("spotify",):
        app = "Spotify"
    else:
        app = "Music"
    mapa = {"play": "play", "reproducir": "play", "pausa": "pause", "pause": "pause",
            "pausar": "pause", "siguiente": "next track", "next": "next track",
            "anterior": "previous track", "previous": "previous track",
            "playpause": "playpause", "alterna": "playpause"}
    orden = mapa.get(accion, "playpause")
    with actividad.accion("Control de música", f"{app}: {accion}", icono="🎵"):
        r = _osascript(f'tell application "{app}" to {orden}')
    return f"{app}: {accion}." if "no disponible" not in r else r


def _h_volumen(args: dict) -> str:
    nivel = args.get("nivel")
    with actividad.accion("Ajustando volumen", str(nivel), icono="🔊"):
        if nivel is None:
            r = _osascript("output volume of (get volume settings)")
            return f"Volumen actual: {r}."
        try:
            n = max(0, min(100, int(nivel)))
        except (TypeError, ValueError):
            return "Dime un nivel de 0 a 100."
        r = _osascript(f"set volume output volume {n}")
        if "no disponible" in r:
            return r
    return f"Volumen al {n}%."


# ==============================================================================
# NAVEGADOR controlable — abrir webs y HACER CLIC (aceptar cookies, botones)
# ==============================================================================
def _h_navegador_web(args: dict) -> str:
    url = (args.get("url") or "").strip()
    clic = (args.get("clic") or "").strip()
    leer = bool(args.get("leer"))
    if not url and not clic and not leer:
        return "Dime una url que abrir y/o un botón que pulsar (clic)."
    import navegador
    partes = []
    with actividad.accion("Navegando", url or clic, icono="🖱️") as a:
        if url:
            partes.append(navegador.NAV.enviar("abrir", url))
        if clic:
            a.detalle(f"pulsando «{clic}»")
            partes.append(navegador.NAV.enviar("clic", clic))
        if leer:
            partes.append(navegador.NAV.enviar("leer"))
    return " ".join(partes) if partes else "Hecho."


def _h_web_clic(args: dict) -> str:
    texto = (args.get("texto") or "").strip()
    if not texto:
        return "Dime qué botón o enlace pulsar."
    import navegador
    with actividad.accion("Clic en la web", texto, icono="🖱️"):
        return navegador.NAV.enviar("clic", texto)


# ==============================================================================
# Registro
# ==============================================================================
ESQUEMAS: list[dict] = [
    {"name": "buscar_web", "description": "Busca en internet (varios motores) y devuelve resultados con fragmentos.",
     "input_schema": {"type": "object", "properties": {
         "consulta": {"type": "string"}, "resultados": {"type": "integer"}},
         "required": ["consulta"]}},
    {"name": "buscar_noticias_web", "description": "Busca noticias recientes sobre un tema.",
     "input_schema": {"type": "object", "properties": {"consulta": {"type": "string"}},
                      "required": ["consulta"]}},
    {"name": "leer_url", "description": "Abre una URL y devuelve su texto principal.",
     "input_schema": {"type": "object", "properties": {"url": {"type": "string"}},
                      "required": ["url"]}},
    {"name": "noticias", "description": "Titulares de las fuentes RSS configuradas.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "tiempo", "description": "El tiempo actual en una ciudad.",
     "input_schema": {"type": "object", "properties": {"ciudad": {"type": "string"}}}},
    {"name": "cotizacion", "description": "Cotización de un valor/índice/divisa (Yahoo Finance).",
     "input_schema": {"type": "object", "properties": {"simbolo": {"type": "string"}},
                      "required": ["simbolo"]}},
    {"name": "resumen_mercado", "description": "Resumen rápido de índices y activos clave.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "convertir_divisa", "description": "Convierte una cantidad entre divisas.",
     "input_schema": {"type": "object", "properties": {
         "cantidad": {"type": "number"}, "origen": {"type": "string"}, "destino": {"type": "string"}}}},
    {"name": "wikipedia", "description": "Resumen de Wikipedia en español.",
     "input_schema": {"type": "object", "properties": {"termino": {"type": "string"}},
                      "required": ["termino"]}},
    {"name": "calcular", "description": "Evalúa una expresión matemática de forma segura.",
     "input_schema": {"type": "object", "properties": {"expresion": {"type": "string"}},
                      "required": ["expresion"]}},
    {"name": "generar_documento", "description": "Crea un documento (md/txt/html/pdf) en la carpeta de documentos y lo abre.",
     "input_schema": {"type": "object", "properties": {
         "titulo": {"type": "string"}, "contenido": {"type": "string"},
         "formato": {"type": "string", "enum": ["md", "txt", "html", "pdf"]},
         "abrir": {"type": "boolean"}}, "required": ["titulo", "contenido"]}},
    {"name": "agenda_hoy", "description": "Eventos de hoy en Calendario (solo lectura).",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "recordatorios_pendientes", "description": "Recordatorios sin completar (solo lectura).",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "copiar_al_portapapeles", "description": "Copia texto al portapapeles.",
     "input_schema": {"type": "object", "properties": {"texto": {"type": "string"}},
                      "required": ["texto"]}},
    {"name": "leer_archivo_texto", "description": "Lee un archivo .txt/.md/.csv/.json/.pdf.",
     "input_schema": {"type": "object", "properties": {"ruta": {"type": "string"}},
                      "required": ["ruta"]}},
    {"name": "crear_evento", "description": "Prepara la creación de un evento (requiere confirmación).",
     "input_schema": {"type": "object", "properties": {
         "titulo": {"type": "string"}, "inicio": {"type": "string"}}, "required": ["titulo"]}},
    {"name": "ejecutar_atajo", "description": "Prepara la ejecución de un Atajo de macOS (requiere confirmación).",
     "input_schema": {"type": "object", "properties": {"nombre": {"type": "string"}},
                      "required": ["nombre"]}},
    {"name": "ejecutar_comando", "description": "Prepara un comando de terminal (requiere confirmación; peligrosos bloqueados).",
     "input_schema": {"type": "object", "properties": {"comando": {"type": "string"}},
                      "required": ["comando"]}},
    {"name": "enviar_correo", "description": "Prepara el envío de un correo por Mail (requiere confirmación).",
     "input_schema": {"type": "object", "properties": {
         "para": {"type": "string"}, "asunto": {"type": "string"}, "cuerpo": {"type": "string"}},
         "required": ["para"]}},
    {"name": "navegador_web", "description": "Abre una web en un navegador controlado y puede HACER CLIC (p. ej. aceptar cookies) y leerla. Úsalo cuando haya que pulsar botones en una página.",
     "input_schema": {"type": "object", "properties": {
         "url": {"type": "string", "description": "página a abrir"},
         "clic": {"type": "string", "description": "texto del botón/enlace a pulsar, p. ej. 'Acepto y continúo gratis'"},
         "leer": {"type": "boolean", "description": "si true, devuelve el texto de la página"}}}},
    {"name": "web_clic", "description": "Hace clic en un botón o enlace por su texto en la página ya abierta en el navegador controlado.",
     "input_schema": {"type": "object", "properties": {"texto": {"type": "string"}}, "required": ["texto"]}},
    {"name": "control_media", "description": "Controla la música (Music o Spotify): reproducir, pausar, siguiente, anterior.",
     "input_schema": {"type": "object", "properties": {
         "accion": {"type": "string", "enum": ["play", "pausa", "siguiente", "anterior", "playpause"]},
         "app": {"type": "string", "enum": ["Music", "Spotify"]}}}},
    {"name": "volumen", "description": "Consulta o ajusta el volumen del sistema (0-100).",
     "input_schema": {"type": "object", "properties": {"nivel": {"type": "integer"}}}},
]

EJECUTORES: dict[str, Callable[[dict], str]] = {
    "buscar_web": _h_buscar_web,
    "buscar_noticias_web": _h_buscar_noticias_web,
    "leer_url": _h_leer_url,
    "noticias": _h_noticias,
    "tiempo": _h_tiempo,
    "cotizacion": _h_cotizacion,
    "resumen_mercado": _h_resumen_mercado,
    "convertir_divisa": _h_convertir_divisa,
    "wikipedia": _h_wikipedia,
    "calcular": _h_calcular,
    "generar_documento": _h_generar_documento,
    "agenda_hoy": _h_agenda_hoy,
    "recordatorios_pendientes": _h_recordatorios_pendientes,
    "copiar_al_portapapeles": _h_copiar_al_portapapeles,
    "leer_archivo_texto": _h_leer_archivo_texto,
    "crear_evento": _h_crear_evento,
    "ejecutar_atajo": _h_ejecutar_atajo,
    "ejecutar_comando": _h_ejecutar_comando,
    "enviar_correo": _h_enviar_correo,
    "navegador_web": _h_navegador_web,
    "web_clic": _h_web_clic,
    "control_media": _h_control_media,
    "volumen": _h_volumen,
}
