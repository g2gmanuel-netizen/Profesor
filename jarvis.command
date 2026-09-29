#!/bin/bash
# LUCKY — arranque (doble clic). Auto-instala la primera vez y ejecuta.
cd "$(dirname "$0")"

# Instalar si aún no hay entorno.
if [ ! -d ".venv" ]; then
  echo "Primera ejecución: instalando LUCKY…"
  bash ./instalar.sh
fi

source .venv/bin/activate

# Crear .env si falta y pedir la clave.
if [ ! -f .env ]; then
  cp .env.example .env
fi
if ! grep -q "^ANTHROPIC_API_KEY=..*" .env; then
  echo "Falta tu clave de Claude."
  read -r -p "Pega tu ANTHROPIC_API_KEY: " clave
  # sustituye la línea en .env
  /usr/bin/sed -i '' "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=${clave}|" .env
fi

echo "Arrancando LUCKY…"
python jarvis.py "$@"
