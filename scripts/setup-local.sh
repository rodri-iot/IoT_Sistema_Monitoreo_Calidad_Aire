#!/usr/bin/env bash
# Prepara todo lo que NO se versiona (secretos, certificados, ACL, usuarios del broker)
# para poder levantar el stack completo con Docker Compose.
#
#   ./scripts/setup-local.sh
#   docker compose up -d --build
#
# Es idempotente: no pisa .env.local, backend/.env ni la CA si ya existen.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1 || { echo "Falta '$1' en el PATH"; exit 1; }; }
need openssl

# 1) Variables de entorno ---------------------------------------------------
say "Variables de entorno"
[[ -f .env.local ]] || { cp .env.local.example .env.local; echo "creado .env.local"; }
if [[ ! -f backend/.env ]]; then
  cp backend/env.example backend/.env
  echo "creado backend/.env"
fi
if ! grep -q '^JWT_SECRET=' backend/.env; then
  printf '\n# Secreto para firmar los JWT (generado por scripts/setup-local.sh)\nJWT_SECRET=%s\n' "$(openssl rand -hex 32)" >> backend/.env
  echo "JWT_SECRET generado en backend/.env"
fi

# 2) Certificados mTLS ------------------------------------------------------
say "Certificados (CA, broker, backend y nodos)"
( cd mqtt && ./generate_certs_v2.sh )

# 3) Certificados del backend (el contenedor los monta desde backend/certs) -----
say "Copiando certificados del backend"
mkdir -p backend/certs
cp mqtt/certs/ca/ca.crt backend/certs/ca.crt
cp mqtt/certs/clients/backend_smca/client.crt backend/certs/client.crt
cp mqtt/certs/clients/backend_smca/client.key backend/certs/client.key

# 4) ACL y usuarios de Mosquitto --------------------------------------------
say "ACL y usuarios del broker"
# shellcheck disable=SC1091
source .env.local
ACL=mqtt/config/acl
if [[ -f "$ACL" ]]; then
  echo "ya existe $ACL (no se modifica)"
else
  {
    echo "# Generado por scripts/setup-local.sh a partir de DEVICES en .env.local"
    echo "# Con use_identity_as_username true, el CN del certificado es el usuario."
    echo
    echo "# Cualquier cliente autenticado puede publicar lecturas y su Last Will"
    echo "topic write iot/aire/lectura"
    echo "topic write iot/aire/status"
    echo "# Cada cliente solo accede a su propia rama (%u = CN del certificado)"
    echo "pattern readwrite smca/%u/#"
    echo "# Todos pueden leer lo publicado como público por otros"
    echo "topic read smca/+/public/#"
    echo
    echo "# El backend solo lee (mínimo privilegio)"
    echo "user backend_smca"
    echo "topic read iot/aire/#"
    echo "topic read smca/#"
    for dev in $DEVICES; do
      [[ "$dev" == "backend_smca" ]] && continue
      echo
      echo "user $dev"
      echo "topic write iot/aire/lectura"
      echo "topic write iot/aire/status"
      echo "pattern readwrite smca/$dev/#"
    done
  } > "$ACL"
  echo "creado $ACL"
fi

PASSWD=mqtt/config/passwords
if [[ -f "$PASSWD" ]]; then
  echo "ya existe $PASSWD (no se modifica)"
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  first=1
  for dev in $DEVICES; do
    flag=""; [[ $first -eq 1 ]] && flag="-c"
    docker run --rm -v "$ROOT/mqtt/config:/c" eclipse-mosquitto:2.0 \
      mosquitto_passwd -b $flag /c/passwords "$dev" "$(openssl rand -hex 12)" >/dev/null
    first=0
  done
  echo "creado $PASSWD (la contraseña no se usa: el login real es el certificado)"
else
  echo "Docker no está disponible: crear $PASSWD con mosquitto_passwd (un usuario por cada CN de DEVICES)."
fi

cat <<MSG

Listo. Siguientes pasos:

  docker compose up -d --build
  docker cp backend/scripts/create-admin.js backend:/app/scripts/ 2>/dev/null || \\
    (docker compose exec backend mkdir -p /app/scripts && docker cp backend/scripts/create-admin.js backend:/app/scripts/)
  docker compose exec backend node /app/scripts/create-admin.js   # super@smca.com / admin123 (cambiarla)

  cd frontend && npm install && npm run dev                        # http://localhost:5173

Certificados de los nodos: mqtt/certs/clients/<nodo>/{client.crt,client.key} + mqtt/certs/ca/ca.crt
MSG
