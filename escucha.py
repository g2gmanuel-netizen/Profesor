from __future__ import annotations

"""Escucha de LUCKY: activación por voz, por palabra clave y por dos palmas.

Objetivos que pediste:
  - Se activa cuando das DOS PALMAS 👏👏.
  - Se activa cuando dices «lucky», «oye lucky», «hola lucky».
  - Se activa cuando simplemente hablas (modo abierto).
  - NO te interrumpe: espera a que termines de hablar (silencio) antes de
    procesar, y no captura su propia voz mientras responde.

Motor: `sounddevice` para el micrófono + `faster-whisper` para voz->texto.
Si faltan dependencias, se desactiva la voz con un aviso y el resto sigue
funcionando (bola + texto).
"""

import os
import re
import threading
import time
import unicodedata
from typing import Callable

try:
    import numpy as np
    import sounddevice as sd
    from faster_whisper import WhisperModel
    _DISPONIBLE = True
except Exception as _e:  # noqa: BLE001
    _DISPONIBLE = False
    _IMPORT_ERR = _e


def _normalizar(t: str) -> str:
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^\w\s]", " ", t).strip()


class Escucha(threading.Thread):
    FS = 16000               # frecuencia de muestreo
    BLOQUE = 0.05            # 50 ms por bloque
    SILENCIO_FIN = 0.7       # silencio (s) que marca fin de frase (bajo = menos lag)
    MAX_FRASE = 15.0         # tope de una intervención
    UMBRAL_VOZ = 0.012       # RMS mínimo para considerar "habla"
    UMBRAL_BARGE = 0.045     # RMS para interrumpir a LUCKY mientras habla (alto: evita eco)
    BARGE_FRAMES = 4         # nº de bloques (~200 ms) seguidos para confirmar interrupción
    UMBRAL_PALMA = 0.28      # pico para considerar una palmada
    PALMAS_MIN = 0.12        # separación mínima entre dos palmas
    PALMAS_MAX = 0.9         # separación máxima entre dos palmas

    def __init__(self, procesar: Callable[[str], None],
                 al_activar: Callable[[str], None] | None = None,
                 al_callar: Callable[[], None] | None = None):
        super().__init__(daemon=True)
        self._procesar = procesar
        self.al_activar = al_activar or (lambda origen: None)
        self.al_callar = al_callar or (lambda: None)
        self.activo = True
        self.asistente_hablando = threading.Event()  # True mientras LUCKY habla
        self.modo = os.environ.get("JARVIS_MODO_ESCUCHA", "wake").strip().lower()
        palabras = os.environ.get("JARVIS_ACTIVACION", "lucky,oye lucky,hola lucky")
        extra = os.environ.get("JARVIS_ACTIVACION_EXTRA", "")
        self.activaciones = [_normalizar(p) for p in (palabras + "," + extra).split(",") if p.strip()]
        self._modelo = None

    # --- API pública ----------------------------------------------------------
    def procesar(self, texto: str) -> None:
        """Lanza el cerebro en un hilo aparte: el micro NUNCA se bloquea."""
        threading.Thread(target=self._procesar, args=(texto,), daemon=True).start()

    def marcar_hablando(self, valor: bool) -> None:
        if valor:
            self.asistente_hablando.set()
        else:
            self.asistente_hablando.clear()

    def detener(self) -> None:
        self.activo = False

    # --- interno --------------------------------------------------------------
    def _cargar_modelo(self):
        if self._modelo is None:
            tam = os.environ.get("JARVIS_WHISPER", "small").strip() or "small"
            self._modelo = WhisperModel(tam, device="cpu", compute_type="int8")
        return self._modelo

    def _transcribir(self, audio) -> str:
        modelo = self._cargar_modelo()
        segmentos, _ = modelo.transcribe(audio, language="es", vad_filter=True,
                                         beam_size=1)
        return " ".join(s.text for s in segmentos).strip()

    def _quitar_activacion(self, texto: str) -> tuple[bool, str]:
        norm = _normalizar(texto)
        for act in self.activaciones:
            if act and act in norm:
                # devuelve lo que sigue a la activación
                resto = norm.split(act, 1)[1].strip()
                # recuperar el resto en el texto original (aprox.)
                idx = norm.find(act) + len(act)
                original_resto = texto[idx:].strip() if idx < len(texto) else resto
                return True, original_resto or resto
        return False, texto

    def run(self) -> None:
        if not _DISPONIBLE:
            print(f"[escucha] Voz desactivada (falta dependencia: {_IMPORT_ERR}). "
                  f"Usa la caja de texto de la bola.")
            return
        bloque_n = int(self.FS * self.BLOQUE)
        buffer: list = []          # frames de la frase en curso
        capturando = False
        ult_voz = 0.0
        inicio_frase = 0.0
        ult_palma = 0.0
        barge = 0                  # bloques seguidos de voz mientras LUCKY habla
        print(f"[escucha] En línea (modo={self.modo}). Palmas 👏👏, «lucky» o habla.")

        with sd.InputStream(samplerate=self.FS, channels=1, blocksize=bloque_n,
                            dtype="float32") as stream:
            while self.activo:
                datos, _ = stream.read(bloque_n)
                muestras = datos[:, 0]
                rms = float(np.sqrt(np.mean(muestras ** 2)) + 1e-9)
                pico = float(np.max(np.abs(muestras)))
                ahora = time.time()

                # --- detección de dos palmas ---
                if pico > self.UMBRAL_PALMA and rms < self.UMBRAL_PALMA:  # transitorio breve
                    if self.PALMAS_MIN < (ahora - ult_palma) < self.PALMAS_MAX:
                        ult_palma = 0.0
                        self.al_activar("palmas")
                        self._despertar_ventana(stream, bloque_n)
                        continue
                    ult_palma = ahora

                # Barge-in: si el usuario habla mientras LUCKY responde, se calla
                # AL INSTANTE y empieza a atenderle (mínimo lag).
                if self.asistente_hablando.is_set():
                    if rms > self.UMBRAL_BARGE:
                        barge += 1
                        if barge >= self.BARGE_FRAMES:
                            self.al_callar()                 # corta la voz de LUCKY
                            self.marcar_hablando(False)
                            barge = 0
                            capturando = True                # captura desde ya
                            inicio_frase = ahora
                            ult_voz = ahora
                            buffer = [muestras.copy()]
                    else:
                        barge = 0
                    continue
                barge = 0

                # --- endpointing por energía ---
                if rms > self.UMBRAL_VOZ:
                    if not capturando:
                        capturando = True
                        inicio_frase = ahora
                        buffer = []
                    buffer.append(muestras.copy())
                    ult_voz = ahora
                elif capturando:
                    buffer.append(muestras.copy())
                    fin = (ahora - ult_voz) > self.SILENCIO_FIN
                    largo = (ahora - inicio_frase) > self.MAX_FRASE
                    if fin or largo:
                        capturando = False
                        audio = np.concatenate(buffer) if buffer else None
                        buffer = []
                        if audio is not None and len(audio) > self.FS * 0.3:
                            self._procesar_frase(audio)

    def _despertar_ventana(self, stream, bloque_n: float) -> None:
        """Tras palmas: abre una ventana breve para capturar la orden."""
        self.al_activar("escuchando")
        buffer, ult_voz, inicio = [], time.time(), time.time()
        while self.activo and (time.time() - inicio) < 8:
            datos, _ = stream.read(int(bloque_n))
            m = datos[:, 0]
            buffer.append(m.copy())
            if float(np.sqrt(np.mean(m ** 2))) > self.UMBRAL_VOZ:
                ult_voz = time.time()
            elif (time.time() - ult_voz) > self.SILENCIO_FIN and (time.time() - inicio) > 1:
                break
        audio = np.concatenate(buffer) if buffer else None
        if audio is not None and len(audio) > self.FS * 0.3:
            texto = self._transcribir(audio)
            if texto:
                self.procesar(texto)

    def _procesar_frase(self, audio) -> None:
        texto = self._transcribir(audio)
        if not texto or len(texto) < 2:
            return
        activado, resto = self._quitar_activacion(texto)
        if self.modo == "abierto":
            self.al_activar("voz")
            self.procesar(resto if activado else texto)
        else:  # modo "wake": requiere palabra de activación
            if activado:
                self.al_activar("voz")
                if resto:
                    self.procesar(resto)
                # si solo dijo "lucky", queda a la espera; el bucle capturará lo siguiente
            # si no hay activación en modo wake, se ignora (no interrumpe)
