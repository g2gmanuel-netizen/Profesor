#!/bin/bash
# LUCKY — instalación (doble clic). Solo instala; no arranca.
cd "$(dirname "$0")"
bash ./instalar.sh
echo ""
echo "Listo. Ahora haz doble clic en «jarvis.command» para arrancar a Lucky."
read -r -p "Pulsa Enter para cerrar…" _
