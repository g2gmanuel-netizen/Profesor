from __future__ import annotations

"""Bus de actividad de LUCKY.

Registra en tiempo real todo lo que el asistente hace (abrir carpetas, crear
documentos, enviar correos, buscar en internet, etc.) para que la bola pueda
mostrar un panel de actividad. Es un almacén en memoria, seguro entre hilos,
que la interfaz consulta por HTTP en /api/actividad.

Estados de una actividad:
  - "preparado"  : acción con consecuencias, a la espera de "confirmo".
  - "ejecutando" : en curso.
  - "hecho"      : completada con éxito.
  - "error"      : falló.
"""

import itertools
import threading
import time
from typing import Any

_lock = threading.Lock()
_secuencia = itertools.count(1)
_actividades: list[dict[str, Any]] = []
_MAX = 60


def registrar(titulo: str, detalle: str = "", estado: str = "ejecutando",
              icono: str = "•") -> int:
    """Crea una entrada de actividad y devuelve su id para actualizarla."""
    with _lock:
        act_id = next(_secuencia)
        _actividades.append({
            "id": act_id,
            "titulo": titulo,
            "detalle": detalle,
            "estado": estado,
            "icono": icono,
            "ts": time.time(),
        })
        if len(_actividades) > _MAX:
            del _actividades[: len(_actividades) - _MAX]
    return act_id


def actualizar(act_id: int, estado: str | None = None, detalle: str | None = None,
               titulo: str | None = None) -> None:
    with _lock:
        for act in _actividades:
            if act["id"] == act_id:
                if estado is not None:
                    act["estado"] = estado
                if detalle is not None:
                    act["detalle"] = detalle
                if titulo is not None:
                    act["titulo"] = titulo
                act["ts"] = time.time()
                return


def listar(desde_id: int = 0) -> list[dict[str, Any]]:
    """Devuelve las actividades con id > desde_id (para sondeo incremental)."""
    with _lock:
        return [dict(a) for a in _actividades if a["id"] > desde_id]


def ultimo_id() -> int:
    with _lock:
        return _actividades[-1]["id"] if _actividades else 0


class accion:
    """Gestor de contexto para envolver una acción y reflejarla en el panel.

    Uso:
        with accion("Creando documento", "informe.md", icono="📄") as a:
            ...  # trabajo
            a.detalle("guardado en ~/Documentos/informe.md")
    """

    def __init__(self, titulo: str, detalle: str = "", icono: str = "•"):
        self.titulo = titulo
        self._detalle = detalle
        self.icono = icono
        self.id = 0

    def __enter__(self) -> "accion":
        self.id = registrar(self.titulo, self._detalle, "ejecutando", self.icono)
        return self

    def detalle(self, texto: str) -> None:
        actualizar(self.id, detalle=texto)

    def __exit__(self, exc_type, exc, tb) -> bool:
        if exc_type is None:
            actualizar(self.id, estado="hecho")
        else:
            actualizar(self.id, estado="error", detalle=f"{self._detalle}  —  {exc}".strip(" —"))
        return False  # no silenciar excepciones
