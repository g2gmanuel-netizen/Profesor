#!/bin/bash
# LUCKY — quita el arranque automático (deja de escuchar en segundo plano).
LABEL="com.lucky.asistente"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
launchctl unload "$PLIST" 2>/dev/null
rm -f "$PLIST"
echo "✅ Arranque automático desinstalado. Ya no se abrirá solo."
read -r -p "Pulsa Enter para cerrar…" _
