from __future__ import annotations

"""Herramientas de estado local y sistema de LUCKY.

Gestiona los archivos de `estado/` (perfil, proyectos, tareas, decisiones,
diario, memoria) y las acciones locales básicas. Fusiona además las
herramientas de internet/acciones definidas en `extras.py`.
"""

import os
import subprocess
from datetime import datetime
from typing import Callable

import actividad
import extras

RAIZ = os.path.dirname(os.path.abspath(__file__))
ESTADO = os.path.join(RAIZ, "estado")
os.makedirs(ESTADO, exist_ok=True)


def _ruta(nombre: str) -> str:
    return os.path.join(ESTADO, nombre)


def _leer(nombre: str) -> str:
    r = _ruta(nombre)
    if os.path.exists(r):
        with open(r, encoding="utf-8") as f:
            return f.read()
    return ""


def _anexar(nombre: str, texto: str) -> None:
    with open(_ruta(nombre), "a", encoding="utf-8") as f:
        f.write(texto)


# ==============================================================================
def _h_leer_estado(args: dict) -> str:
    seccion = (args.get("seccion") or "").strip().lower()
    mapa = {
        "perfil": "perfil-operativo.md", "proyectos": "proyectos.md",
        "tareas": "tareas.md", "decisiones": "decisiones.md",
        "rutinas": "rutinas.md", "diario": "diario.md", "memoria": "memoria.md",
    }
    if seccion in mapa:
        return _leer(mapa[seccion]) or f"(«{seccion}» está vacío)"
    partes = []
    for etiqueta, arch in mapa.items():
        c = _leer(arch)
        if c.strip():
            partes.append(f"## {etiqueta}\n{c.strip()}")
    return "\n\n".join(partes) or "(estado vacío)"


def _h_anotar_tarea(args: dict) -> str:
    tarea = (args.get("tarea") or "").strip()
    if not tarea:
        return "Falta la tarea."
    with actividad.accion("Anotando tarea", tarea, icono="📝"):
        _anexar("tareas.md", f"- [ ] {tarea}  ({datetime.now():%Y-%m-%d})\n")
        if args.get("recordar"):
            subprocess.run(["osascript", "-e",
                            f'tell application "Reminders" to make new reminder '
                            f'with properties {{name:"{tarea}"}}'], check=False)
    return f"Tarea anotada: {tarea}"


def _h_completar_tarea(args: dict) -> str:
    texto = (args.get("tarea") or "").strip().lower()
    contenido = _leer("tareas.md").splitlines()
    hecho = False
    for i, l in enumerate(contenido):
        if texto in l.lower() and "[ ]" in l:
            contenido[i] = l.replace("[ ]", "[x]")
            hecho = True
            break
    if hecho:
        with open(_ruta("tareas.md"), "w", encoding="utf-8") as f:
            f.write("\n".join(contenido) + "\n")
        return f"Completada: {texto}"
    return f"No encontré una tarea que contenga «{texto}»."


def _h_registrar_decision(args: dict) -> str:
    d = (args.get("decision") or "").strip()
    if not d:
        return "Falta la decisión."
    _anexar("decisiones.md", f"\n### {datetime.now():%Y-%m-%d %H:%M}\n{d}\n")
    return "Decisión registrada."


def _h_nota_diario(args: dict) -> str:
    nota = (args.get("nota") or "").strip()
    if not nota:
        return "Falta la nota."
    _anexar("diario.md", f"\n### {datetime.now():%Y-%m-%d %H:%M}\n{nota}\n")
    return "Anotado en el diario."


def _h_fecha_hora(args: dict) -> str:
    ahora = datetime.now()
    dias = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
    return f"{dias[ahora.weekday()]} {ahora:%d/%m/%Y}, {ahora:%H:%M}."


def _h_abrir(args: dict) -> str:
    objetivo = (args.get("objetivo") or "").strip()
    if not objetivo:
        return "Falta qué abrir (carpeta, archivo, app o URL)."
    with actividad.accion("Abriendo", objetivo, icono="📂"):
        try:
            subprocess.run(["open", os.path.expanduser(objetivo)], check=False)
        except Exception as e:  # noqa: BLE001
            return f"No pude abrir «{objetivo}»: {e}"
    return f"Abriendo: {objetivo}"


def _h_recordar(args: dict) -> str:
    dato = (args.get("dato") or "").strip()
    if not dato:
        return "Falta el dato a recordar."
    _anexar("memoria.md", f"- {dato}\n")
    return f"Lo recordaré: {dato}"


def _h_olvidar(args: dict) -> str:
    texto = (args.get("dato") or "").strip().lower()
    lineas = [l for l in _leer("memoria.md").splitlines() if texto not in l.lower()]
    with open(_ruta("memoria.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lineas) + "\n")
    return f"Olvidado lo relativo a «{texto}»."


def _h_estado_alpaca(args: dict) -> str:
    clave = os.environ.get("ALPACA_API_KEY", "").strip()
    secreto = os.environ.get("ALPACA_API_SECRET", "").strip()
    if not (clave and secreto):
        return "Alpaca no configurado (solo paper y solo lectura)."
    import json
    import urllib.request
    base = os.environ.get("ALPACA_BASE", "https://paper-api.alpaca.markets")
    req = urllib.request.Request(base + "/v2/account",
                                 headers={"APCA-API-KEY-ID": clave,
                                          "APCA-API-SECRET-KEY": secreto})
    with actividad.accion("Consultando Alpaca (paper)", icono="🏦"):
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                d = json.load(r)
        except Exception as e:  # noqa: BLE001
            return f"No pude consultar Alpaca: {e}"
    return (f"Cuenta (paper): efectivo {d.get('cash')} {d.get('currency', 'USD')}, "
            f"valor {d.get('portfolio_value')}, estado {d.get('status')}.")


# ==============================================================================
# Registro local + fusión con extras
# ==============================================================================
_ESQUEMAS_LOCALES: list[dict] = [
    {"name": "leer_estado", "description": "Lee el estado local (perfil, proyectos, tareas, decisiones, rutinas, diario, memoria).",
     "input_schema": {"type": "object", "properties": {"seccion": {"type": "string"}}}},
    {"name": "anotar_tarea", "description": "Anota una tarea (opcionalmente crea recordatorio en la app Recordatorios).",
     "input_schema": {"type": "object", "properties": {
         "tarea": {"type": "string"}, "recordar": {"type": "boolean"}}, "required": ["tarea"]}},
    {"name": "completar_tarea", "description": "Marca una tarea como completada.",
     "input_schema": {"type": "object", "properties": {"tarea": {"type": "string"}},
                      "required": ["tarea"]}},
    {"name": "registrar_decision", "description": "Registra una decisión en decisiones.md.",
     "input_schema": {"type": "object", "properties": {"decision": {"type": "string"}},
                      "required": ["decision"]}},
    {"name": "nota_diario", "description": "Añade una nota al diario.",
     "input_schema": {"type": "object", "properties": {"nota": {"type": "string"}},
                      "required": ["nota"]}},
    {"name": "fecha_hora", "description": "Fecha y hora actuales.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "abrir", "description": "Abre una carpeta, archivo, app o URL en macOS.",
     "input_schema": {"type": "object", "properties": {"objetivo": {"type": "string"}},
                      "required": ["objetivo"]}},
    {"name": "recordar", "description": "Guarda un dato en la memoria a largo plazo.",
     "input_schema": {"type": "object", "properties": {"dato": {"type": "string"}},
                      "required": ["dato"]}},
    {"name": "olvidar", "description": "Elimina un dato de la memoria.",
     "input_schema": {"type": "object", "properties": {"dato": {"type": "string"}},
                      "required": ["dato"]}},
    {"name": "estado_alpaca", "description": "Estado de la cuenta Alpaca (paper, solo lectura).",
     "input_schema": {"type": "object", "properties": {}}},
]

_EJECUTORES_LOCALES: dict[str, Callable[[dict], str]] = {
    "leer_estado": _h_leer_estado,
    "anotar_tarea": _h_anotar_tarea,
    "completar_tarea": _h_completar_tarea,
    "registrar_decision": _h_registrar_decision,
    "nota_diario": _h_nota_diario,
    "fecha_hora": _h_fecha_hora,
    "abrir": _h_abrir,
    "recordar": _h_recordar,
    "olvidar": _h_olvidar,
    "estado_alpaca": _h_estado_alpaca,
}

# Fusión con extras.py
ESQUEMAS: list[dict] = _ESQUEMAS_LOCALES + extras.ESQUEMAS
EJECUTORES: dict[str, Callable[[dict], str]] = {**_EJECUTORES_LOCALES, **extras.EJECUTORES}


def ejecutar(nombre: str, args: dict) -> str:
    fn = EJECUTORES.get(nombre)
    if not fn:
        return f"Herramienta desconocida: {nombre}"
    try:
        return fn(args or {})
    except Exception as e:  # noqa: BLE001
        return f"Error en «{nombre}»: {e}"
