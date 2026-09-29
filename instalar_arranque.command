#!/bin/bash
# LUCKY — instala el arranque automático al iniciar sesión (macOS / launchd).
# Tras esto NO tendrás que abrir nada desde Documentos: Lucky quedará escuchando
# en segundo plano y la bola se abrirá sola al llamarle o dar las palmas.
cd "$(dirname "$0")"
DIR="$(pwd)"
LABEL="com.lucky.asistente"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

# Asegurar entorno instalado.
if [ ! -d ".venv" ]; then
  echo "Instalando dependencias primero…"
  bash ./instalar.sh
fi

mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>cd '$DIR' && source .venv/bin/activate && exec python jarvis.py --fondo</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Interactive</string>
  <key>StandardOutPath</key><string>$DIR/lucky.log</string>
  <key>StandardErrorPath</key><string>$DIR/lucky.log</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null
launchctl load "$PLIST"
echo ""
echo "✅ Listo. LUCKY arrancará SOLO al iniciar sesión y quedará escuchando."
echo "   Llámale («oye lucky») o da 3 palmas 👏👏👏 y la bola se abrirá sola."
echo "   (La primera vez, macOS pedirá permiso de micrófono: acéptalo.)"
read -r -p "Pulsa Enter para cerrar…" _
