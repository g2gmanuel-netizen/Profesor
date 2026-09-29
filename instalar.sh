#!/bin/bash
# LUCKY — instalador: crea el entorno virtual e instala dependencias.
set -e
cd "$(dirname "$0")"

echo "→ Creando entorno virtual (.venv)…"
python3 -m venv .venv
source .venv/bin/activate

echo "→ Actualizando pip…"
pip install --upgrade pip >/dev/null

echo "→ Instalando dependencias…"
pip install -r requirements.txt

if [ ! -f .env ]; then
  echo "→ Creando .env desde la plantilla…"
  cp .env.example .env
  echo "   ⚠️  Edita .env y pon tu ANTHROPIC_API_KEY."
fi

echo "✅ Instalación completada. Arranca con: ./jarvis.command"
