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
    VENTANA_CONV = 15.0      # tras hablarle, sigue atendiendo sin repetir "lucky" (s)
    UMBRAL_VOZ = 0.012       # RMS mínimo para considerar "habla"
    UMBRAL_BARGE = 0.045     # RMS para interrumpir a LUCKY mientras habla (alto: evita eco)
    BARGE_FRAMES = 4         # nº de bloques (~200 ms) seguidos para confirmar interrupción
    UMBRAL_PALMA = 0.28      # pico para considerar una palmada
    PALMAS_MIN = 0.12        # refractario entre palmadas (no contar una dos veces)
    PALMAS_VENTANA = 2.0     # ventana (s) en la que contar la secuencia de palmas

    def __init__(self, procesar: Callable[[str], None],
                 al_activar: Callable[[str], None] | None = None,
                 al_callar: Callable[[], None] | None = None,
                 al_invocar: Callable[[str], None] | None = None):
        super().__init__(daemon=True)
        self._procesar = procesar
        self.al_activar = al_activar or (lambda origen: None)
        self.al_callar = al_callar or (lambda: None)
        # Invocación = "ábrete" (palabra clave o N palmas). Abre la bola.
        self.al_invocar = al_invocar or (lambda origen: None)
        self.palmas_n = max(2, int(os.environ.get("JARVIS_PALMAS", "3") or 3))
        self.activo = True
        self.asistente_hablando = threading.Event()  # True mientras LUCKY habla
        self.modo = os.environ.get("JARVIS_MODO_ESCUCHA", "wake").strip().lower()
        palabras = os.environ.get("JARVIS_ACTIVACION", "lucky,oye lucky,hola lucky")
        extra = os.environ.get("JARVIS_ACTIVACION_EXTRA", "")
        self.activaciones = [_normalizar(p) for p in (palabras + "," + extra).split(",") if p.strip()]
        self.conversacion_hasta = 0.0   # mientras > ahora, atiende sin exigir "lucky"
        self._modelo = None
        self._modelo_lock = threading.Lock()

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
        with self._modelo_lock:
            if self._modelo is None:
                tam = os.environ.get("JARVIS_WHISPER", "base").strip() or "base"
                print(f"[escucha] cargando modelo de voz «{tam}»…")
                self._modelo = WhisperModel(tam, device="cpu", compute_type="int8")
                print("[escucha] modelo de voz listo.")
        return self._modelo

    # Frases que Whisper "inventa" sobre silencio/ruido (no son del usuario).
    _ALUCINACIONES = (
        "subtítulos realizados por", "subtitulos realizados por", "amara.org",
        "gracias por ver", "gracias por su atención", "suscríbete", "suscribete",
        "www.", ".com", "♪",
    )

    def _es_ruido(self, texto: str) -> bool:
        t = texto.lower().strip()
        if len(t) < 2:
            return True
        if any(a in t for a in self._ALUCINACIONES):
            return True
        # solo signos/puntuación o una sílaba suelta
        if not any(c.isalpha() for c in t):
            return True
        return False

    def _transcribir(self, audio) -> str:
        modelo = self._cargar_modelo()
        try:
            segmentos, _ = modelo.transcribe(
                audio, language="es", vad_filter=True, beam_size=1,
                no_speech_threshold=0.6, condition_on_previous_text=False)
            partes = [s.text for s in segmentos
                      if getattr(s, "no_speech_prob", 0.0) < 0.7]
        except Exception as e:  # noqa: BLE001
            print(f"[escucha] error al transcribir: {e}")
            return ""
        texto = " ".join(partes).strip()
        return "" if self._es_ruido(texto) else texto

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
        palmas_ts: list = []       # marcas de tiempo de palmadas recientes
        barge = 0                  # bloques seguidos de voz mientras LUCKY habla
        forzar_prox = False        # la próxima frase se procesa sí o sí (fue interrupción)
        # precargar el modelo de voz en segundo plano (evita el lag de la 1ª frase)
        threading.Thread(target=self._cargar_modelo, daemon=True).start()
        print(f"[escucha] En línea (modo={self.modo}). {self.palmas_n} palmas, «lucky» o habla.")

        fallos = 0
        while self.activo:
            try:
                with sd.InputStream(samplerate=self.FS, channels=1, blocksize=bloque_n,
                                    dtype="float32") as stream:
                    fallos = 0
                    while self.activo:
                        datos, _ = stream.read(bloque_n)   # si falla, recrea el stream
                        try:
                            muestras = datos[:, 0]
                            rms = float(np.sqrt(np.mean(muestras ** 2)) + 1e-9)
                            pico = float(np.max(np.abs(muestras)))
                            ahora = time.time()

                            # --- detección de N palmadas (por defecto 3) ---
                            if pico > self.UMBRAL_PALMA and rms < self.UMBRAL_PALMA:
                                if ahora - ult_palma > self.PALMAS_MIN:
                                    ult_palma = ahora
                                    palmas_ts.append(ahora)
                                    palmas_ts = [t for t in palmas_ts if ahora - t <= self.PALMAS_VENTANA]
                                    if len(palmas_ts) >= self.palmas_n:
                                        palmas_ts = []
                                        self.al_invocar("palmas")
                                        self.al_activar("palmas")
                                        self._despertar_ventana(stream, bloque_n)
                                        continue

                            # Barge-in: si el usuario habla mientras LUCKY responde,
                            # se calla AL INSTANTE y empieza a atenderle.
                            if self.asistente_hablando.is_set():
                                if rms > self.UMBRAL_BARGE:
                                    barge += 1
                                    if barge >= self.BARGE_FRAMES:
                                        self.al_callar()
                                        self.marcar_hablando(False)
                                        barge = 0
                                        capturando = True
                                        forzar_prox = True
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
                                        self._procesar_frase(audio, forzar=forzar_prox)
                                    forzar_prox = False
                        except Exception as e:  # noqa: BLE001
                            # un fallo puntual no debe tumbar la escucha
                            print(f"[escucha] aviso: {e}")
                            buffer, capturando = [], False
            except Exception as e:  # noqa: BLE001
                fallos += 1
                if not self.activo:
                    break
                print(f"[escucha] el micrófono falló ({e}); reintento en 2 s… ({fallos})")
                time.sleep(2)
                if fallos >= 6:
                    print("[escucha] demasiados fallos de micrófono; me quedo en modo texto.")
                    return

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

    def _procesar_frase(self, audio, forzar: bool = False) -> None:
        texto = self._transcribir(audio)
        if not texto or len(texto) < 2:
            return
        activado, resto = self._quitar_activacion(texto)
        ahora = time.time()
        en_conversacion = ahora < self.conversacion_hasta
        # Se atiende si: modo abierto, dijo "lucky", fue una interrupción (forzar),
        # o seguimos dentro de la ventana de conversación reciente.
        if self.modo == "abierto" or activado or forzar or en_conversacion:
            if activado:
                self.al_invocar("voz")   # dijo "lucky": abre la bola
            self.al_activar("voz")
            self.conversacion_hasta = ahora + self.VENTANA_CONV  # sigue atendiendo un rato
            mensaje = resto if (activado and resto) else texto
            if activado and not resto and not (forzar or en_conversacion):
                return  # solo dijo "lucky": queda a la espera
            self.procesar(mensaje)
        # en modo wake, sin activación y fuera de conversación: se ignora (no molesta)
