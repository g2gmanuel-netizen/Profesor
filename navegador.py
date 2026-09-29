from __future__ import annotations

"""Navegador controlable de LUCKY (Playwright).

Permite abrir páginas y HACER CLIC de verdad (aceptar cookies, pulsar botones),
escribir y leer contenido. Playwright (sync) es "thread-affine": sus objetos solo
pueden usarse desde el hilo que los creó. Por eso todo el control vive en UN hilo
dedicado y las herramientas le mandan órdenes por una cola.

Si Playwright no está instalado, las herramientas lo dicen con instrucciones.
"""

import queue
import threading


def _click_inteligente(pg, texto: str) -> bool:
    """Intenta pulsar un botón/enlace por su texto, incluso dentro de iframes
    (los banners de cookies suelen ir en un iframe)."""
    intentos = [
        lambda c: c.get_by_role("button", name=texto, exact=False),
        lambda c: c.get_by_role("link", name=texto, exact=False),
        lambda c: c.locator(f"button:has-text(\"{texto}\")"),
        lambda c: c.get_by_text(texto, exact=False),
        lambda c: c.locator(f":text(\"{texto}\")"),
    ]
    contextos = [pg] + list(pg.frames)
    for ctx in contextos:
        for hacer in intentos:
            try:
                loc = hacer(ctx).first
                loc.wait_for(state="visible", timeout=2500)
                loc.click(timeout=2500)
                return True
            except Exception:  # noqa: BLE001
                continue
    return False


class _Navegador:
    def __init__(self) -> None:
        self.cmds: "queue.Queue" = queue.Queue()
        self.res: "queue.Queue" = queue.Queue()
        self.hilo: threading.Thread | None = None
        self.vivo = False
        self._lock = threading.Lock()

    def _run(self) -> None:
        try:
            from playwright.sync_api import sync_playwright
        except Exception as e:  # noqa: BLE001
            self.res.put(("error", f"Playwright no está instalado ({e}). "
                                   "Instálalo con: pip install playwright && python -m playwright install chromium"))
            return
        try:
            with sync_playwright() as p:
                nav = p.chromium.launch(headless=False)
                pg = nav.new_page()
                self.res.put(("ok", "navegador listo"))
                while True:
                    accion, arg = self.cmds.get()
                    try:
                        if accion == "cerrar":
                            nav.close()
                            self.res.put(("ok", "Navegador cerrado."))
                            return
                        elif accion == "abrir":
                            pg.goto(arg, wait_until="domcontentloaded", timeout=30000)
                            self.res.put(("ok", f"Abierta la página: {arg}"))
                        elif accion == "clic":
                            ok = _click_inteligente(pg, arg)
                            self.res.put(("ok" if ok else "error",
                                          f"Clic en «{arg}»." if ok
                                          else f"No encontré «{arg}» para pulsar."))
                        elif accion == "escribir":
                            sel, texto = arg
                            pg.fill(sel, texto, timeout=8000)
                            self.res.put(("ok", "Texto escrito."))
                        elif accion == "leer":
                            self.res.put(("ok", pg.inner_text("body")[:4000]))
                        else:
                            self.res.put(("error", f"Acción desconocida: {accion}"))
                    except Exception as e:  # noqa: BLE001
                        self.res.put(("error", str(e)[:200]))
        except Exception as e:  # noqa: BLE001
            self.res.put(("error", f"No pude iniciar el navegador: {e}"))
        finally:
            self.vivo = False

    def _asegura(self) -> tuple[str, str]:
        if self.vivo and self.hilo and self.hilo.is_alive():
            return ("ok", "activo")
        self.hilo = threading.Thread(target=self._run, daemon=True)
        self.hilo.start()
        self.vivo = True
        try:
            return self.res.get(timeout=60)   # espera "navegador listo" o error
        except queue.Empty:
            return ("error", "El navegador no arrancó a tiempo.")

    def enviar(self, accion: str, arg=None, timeout: int = 45) -> str:
        with self._lock:   # una orden a la vez
            estado = self._asegura()
            if estado[0] == "error":
                self.vivo = False
                return estado[1]
            self.cmds.put((accion, arg))
            try:
                _, msg = self.res.get(timeout=timeout)
            except queue.Empty:
                return "El navegador tardó demasiado en responder."
            return msg


NAV = _Navegador()
