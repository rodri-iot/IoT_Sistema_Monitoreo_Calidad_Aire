#!/bin/bash

# =============================
# 📌 CONFIGURACIÓN CON .env.local
# =============================

ENV_FILE="./.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Archivo .env.local no encontrado en $(pwd)/$ENV_FILE"
  exit 1
fi

source "$ENV_FILE"

if [ -z "$MQTT_IP" ]; then
  echo "❌ La variable MQTT_IP no está definida en .env.local"
  exit 1
fi

IP="$MQTT_IP"
DAYS=365
CERT_DIR="./mqtt/certs"

SUBJECT_CA="/C=AR/ST=CABA/L=CABA/O=FIUBA/OU=CA/CN=$IP"
SUBJECT_SERVER="/C=AR/ST=CABA/L=CABA/O=FIUBA/OU=Server/CN=$IP"
SUBJECT_CLIENT="/C=AR/ST=CABA/L=CABA/O=FIUBA/OU=Client/CN=$IP"

mkdir -p "$CERT_DIR"
cd "$CERT_DIR" || exit 1

echo "🔁 CN utilizado: $IP"
echo "📂 Generando certificados en: $(pwd)"

# =============================
# 🧹 Limpieza previa
# =============================
echo "🧹 Eliminando certificados previos..."
rm -f *.key *.crt *.csr *.srl *.pem

# =============================
# 🛠️ Generar archivo openssl.cnf si no existe
# =============================
CONF_FILE="../server_openssl.cnf"
if [ ! -f "$CONF_FILE" ]; then
  echo "📄 Generando archivo server_openssl.cnf"
  cat > "$CONF_FILE" <<EOF
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[ dn ]
C  = AR
ST = CABA
L  = CABA
O  = FIUBA
OU = Server
CN = $IP

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
IP.1 = $IP
DNS.1 = mosquitto
EOF
fi

# =============================
# 🔐 Generación de CA
# =============================
echo "🔐 Generando CA..."
openssl req -x509 -nodes -sha256 -newkey rsa:2048 -subj "$SUBJECT_CA"   -days $DAYS -keyout ca.key -out ca.crt

# =============================
# 🔐 Certificado del servidor con SAN
# =============================
echo "🔐 Generando certificado del servidor (con SAN)..."
openssl req -nodes -sha256 -new -keyout server.key -out server.csr -config "$CONF_FILE"
openssl x509 -req -sha256 -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial   -out server.crt -days $DAYS -extensions req_ext -extfile "$CONF_FILE"

# =============================
# 👤 Certificado del cliente
# =============================
echo "👤 Generando certificado del cliente..."
openssl req -new -nodes -sha256 -subj "$SUBJECT_CLIENT" -keyout client.key -out client.csr
openssl x509 -req -sha256 -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial   -out client.crt -days $DAYS

# =============================
# ✅ Resultado
# =============================
echo "✅ Certificados generados:"
ls -lh *.crt *.key

# =============================
# 🧹 Limpieza final
# =============================
rm -f *.csr *.srl
echo "🧹 Archivos temporales eliminados."
