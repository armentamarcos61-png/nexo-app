#!/usr/bin/env bash
# NEXO-404: recuperar el servidor local sin borrar ni sobrescribir trabajo.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .expo
exec 9>.expo/nexo-preview.lock
if ! flock -n 9; then
  echo "Nexo: ya hay un arranque en curso."
  exit 0
fi
if curl --fail --silent --max-time 3 http://127.0.0.1:8081/status | grep -q 'packager-status:running'; then
  echo "Nexo: Metro ya responde en el puerto 8081."
else
  if node -e 'const s=require("net").createServer();s.once("error",()=>process.exit(1));s.listen(8081,"0.0.0.0",()=>s.close());'; then
    if [ ! -f node_modules/expo/bin/cli ]; then
      echo "Faltan dependencias. Ejecuta npm ci y vuelve a iniciar."
      exit 1
    fi
    nohup env CI=1 node node_modules/expo/bin/cli start --web --host lan --port 8081 >.expo/nexo-preview.log 2>&1 < /dev/null 9>&- &
    preview_pid=$!
    ready=0
    for attempt in $(seq 1 60); do
      if curl --fail --silent --max-time 2 http://127.0.0.1:8081/status | grep -q 'packager-status:running'; then
        ready=1
        break
      fi
      if ! kill -0 "$preview_pid" 2>/dev/null; then break; fi
      sleep 1
    done
    if [ "$ready" != 1 ]; then
      echo "NEXO-404: Metro no respondió. Revisa .expo/nexo-preview.log."
      exit 1
    fi
  else
    echo "NEXO-404: otro proceso ocupa 8081. No se detuvo ni se cambió el puerto."
    exit 1
  fi
fi
echo "Servidor local disponible: http://localhost:8081"
if [ -n "${CODESPACE_NAME:-}" ]; then
  echo "Vista de prueba: https://${CODESPACE_NAME}-8081.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}/"
fi
echo "Esto confirma Metro local; abre la vista para comprobar el reenvío y la app."
