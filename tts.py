from __future__ import annotations

"""Voz de LUCKY.

Motor automático, de más natural a más básico:
  1. ElevenLabs  (si ELEVENLABS_API_KEY)  -> voz humana, la menos robótica.
  2. OpenAI TTS  (si OPENAI_API_KEY)       -> voz humana.
  3. macOS `say` (siempre disponible)      -> respaldo del sistema.

Reproduce mp3 con `afplay` (macOS). Si algo falla, cae SIEMPRE a la voz del
sistema para no quedarse mudo. Todo pensado para sonar lo más natural posible:
frases limpias, sin leer markdown ni URLs largas.
"""

import os
import re
import subprocess
import tempfile
import threading
import urllib.request
import json

# --- Configuración por entorno -------------------------------------------------
_MOTOR = os.environ.get("JARVIS_TTS", "auto").strip().lower()
_VOZ = os.environ.get("JARVIS_VOZ", "").strip()
_VELOCIDAD = os.environ.get("JARVIS_VELOCIDAD", "175").strip()
_EL_KEY = os.environ.get("ELEVENLABS_API_KEY", "").strip()
_OA_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
# Voz grave/británica genérica por defecto (NO se clona la voz real de nadie).
_EL_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "onwK4e9ZLuTAKqWW03F9").strip()  # "Daniel"
_OA_VOICE = os.environ.get("OPENAI_VOICE", "onyx").strip()

_lock = threading.Lock()  # una sola voz a la vez (que no se pisen las frases)
_proc_lock = threading.Lock()
_voz_es_cache: str | None = None


def _mejor_voz_es() -> str:
    """Elige la mejor voz española instalada en macOS (evita que hable en inglés)."""
    global _voz_es_cache
    if _voz_es_cache is not None:
        return _voz_es_cache
    preferidas = ["Mónica", "Monica", "Marisol", "Jorge", "Diego", "Paulina", "Juan"]
    disponibles: list[str] = []
    try:
        salida = subprocess.run(["say", "-v", "?"], capture_output=True, text=True, timeout=8).stdout
        for linea in salida.splitlines():
            # formato: "Nombre            es_ES    # ejemplo"
            m = re.match(r"(.+?)\s{2,}([a-z]{2}_[A-Z]{2})", linea)
            if m and m.group(2).startswith("es"):
                disponibles.append(m.group(1).strip())
    except Exception:  # noqa: BLE001
        disponibles = []
    elegida = ""
    for p in preferidas:
        if p in disponibles:
            elegida = p
            break
    if not elegida and disponibles:
        elegida = disponibles[0]
    _voz_es_cache = elegida
    return elegida
_proc: subprocess.Popen | None = None  # proceso de audio en curso (para poder callar)
_interrumpido = threading.Event()


def _lanzar(cmd: list[str], entrada: bytes | None = None) -> None:
    """Ejecuta un reproductor/voz guardando el proceso para poder cortarlo."""
    global _proc
    with _proc_lock:
        _proc = subprocess.Popen(cmd, stdin=subprocess.PIPE if entrada else None,
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        _proc.communicate(input=entrada)
    finally:
        with _proc_lock:
            _proc = None


def callar() -> None:
    """Corta AHORA lo que se esté diciendo (barge-in: el usuario ha hablado)."""
    _interrumpido.set()
    with _proc_lock:
        if _proc and _proc.poll() is None:
            try:
                _proc.terminate()
            except Exception:  # noqa: BLE001
                pass


def _limpiar(texto: str) -> str:
    """Quita marcas de markdown, URLs y ruido para que la voz suene natural."""
    t = texto
    t = re.sub(r"```.*?```", " ", t, flags=re.S)          # bloques de código
    t = re.sub(r"`([^`]*)`", r"\1", t)                     # código en línea
    t = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", t)        # enlaces/imágenes
    t = re.sub(r"https?://\S+", "un enlace", t)             # urls sueltas
    t = re.sub(r"[*_#>|]+", " ", t)                         # símbolos markdown
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{2,}", ". ", t)
    return t.strip()


def _reproducir_mp3(datos: bytes) -> bool:
    try:
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            f.write(datos)
            ruta = f.name
        _lanzar(["afplay", ruta])
        try:
            os.remove(ruta)
        except OSError:
            pass
        return True
    except Exception:
        return False


def _voz_sistema(texto: str) -> None:
    cmd = ["say"]
    voz = _VOZ or _mejor_voz_es()   # si no se fija voz, usar la mejor española
    if voz:
        cmd += ["-v", voz]
    if _VELOCIDAD:
        cmd += ["-r", str(_VELOCIDAD)]
    cmd.append(texto)
    try:
        _lanzar(cmd)
    except Exception:
        pass  # sin sonido, pero sin romper


def _elevenlabs(texto: str) -> bool:
    if not _EL_KEY:
        return False
    try:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{_EL_VOICE_ID}"
        cuerpo = json.dumps({
            "text": texto,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.75,
                               "style": 0.3, "use_speaker_boost": True},
        }).encode("utf-8")
        req = urllib.request.Request(url, data=cuerpo, method="POST", headers={
            "xi-api-key": _EL_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        })
        with urllib.request.urlopen(req, timeout=30) as r:
            return _reproducir_mp3(r.read())
    except Exception:
        return False


def _openai(texto: str) -> bool:
    if not _OA_KEY:
        return False
    try:
        url = "https://api.openai.com/v1/audio/speech"
        cuerpo = json.dumps({
            "model": "gpt-4o-mini-tts",
            "voice": _OA_VOICE,
            "input": texto,
            "response_format": "mp3",
        }).encode("utf-8")
        req = urllib.request.Request(url, data=cuerpo, method="POST", headers={
            "Authorization": f"Bearer {_OA_KEY}",
            "Content-Type": "application/json",
        })
        with urllib.request.urlopen(req, timeout=30) as r:
            return _reproducir_mp3(r.read())
    except Exception:
        return False


def _frases(texto: str) -> list[str]:
    """Trocea en frases para empezar a hablar antes y cortar al instante."""
    trozos = re.split(r"(?<=[\.\!\?…:])\s+", texto)
    return [t.strip() for t in trozos if t.strip()]


def _decir_una(frase: str) -> None:
    motor = _MOTOR
    if motor in ("auto", ""):
        if _elevenlabs(frase) or _openai(frase):
            return
        _voz_sistema(frase)
    elif motor == "elevenlabs":
        if not _elevenlabs(frase):
            _voz_sistema(frase)
    elif motor == "openai":
        if not _openai(frase):
            _voz_sistema(frase)
    else:  # "sistema" / "say" / desconocido
        _voz_sistema(frase)


def hablar(texto: str) -> None:
    """Dice `texto` en voz alta, frase a frase, con la voz más natural.

    Si el usuario interrumpe (tts.callar()), se detiene de inmediato.
    """
    limpio = _limpiar(texto)
    if not limpio:
        return
    with _lock:
        _interrumpido.clear()
        for frase in _frases(limpio):
            if _interrumpido.is_set():
                break
            _decir_una(frase)


if __name__ == "__main__":
    hablar("Hola Profesor, soy Lucky. Voz en línea.")
