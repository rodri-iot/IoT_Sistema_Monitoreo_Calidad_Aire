#!/usr/bin/env bash
set -euo pipefail

# ============== Config y entorno ==============
ENV_FILE="../.env.local"
[[ -f "$ENV_FILE" ]] || { echo "❌ Falta $ENV_FILE"; exit 1; }
# shellcheck disable=SC1090
source "$ENV_FILE"

HOST="${MQTT_HOST:?❌ Define MQTT_HOST en .env.local}"
DAYS="${CERT_DAYS:-365}"
# El script se ejecuta desde mqtt/, por lo que usa ./certs (no ./mqtt/certs)
CERT_DIR="./certs"
CA_DIR="$CERT_DIR/ca"
SERVER_DIR="$CERT_DIR/server"
CLIENTS_DIR="$CERT_DIR/clients"

mkdir -p "$CA_DIR" "$SERVER_DIR" "$CLIENTS_DIR"

# Campos X.509 (defaults si faltan)
C="${C:-AR}"; ST="${ST:-CABA}"; L="${L:-CABA}"; O="${O:-FIUBA}"

# Helpers
is_ipv4() {
  [[ "$1" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
}

# ============== 1) CA (si no existe) ==============
if [[ ! -f "$CA_DIR/ca.crt" || ! -f "$CA_DIR/ca.key" ]]; then
  echo "🔐 Generando CA..."
  openssl req -x509 -nodes -sha256 -newkey rsa:2048 \
    -subj "/C=$C/ST=$ST/L=$L/O=$O/OU=CA/CN=SMCA-Dev-CA" \
    -days "$DAYS" -keyout "$CA_DIR/ca.key" -out "$CA_DIR/ca.crt"
fi

# ============== 2) SERVER cert ==============
echo "📄 Preparando server_openssl.cnf"

# Extraer hostname si MQTT_HOST contiene URL (ej: mqtts://mosquitto:8883 -> mosquitto)
# o usar el valor directo si es IP o hostname simple
if [[ "$HOST" =~ ^[a-z]+://(.+):[0-9]+$ ]]; then
  EXTRACTED_HOST="${BASH_REMATCH[1]}"
elif [[ "$HOST" =~ ^[a-z]+://(.+)$ ]]; then
  EXTRACTED_HOST="${BASH_REMATCH[1]}"
else
  EXTRACTED_HOST="$HOST"
fi

# Para Docker Compose, usamos 'mosquitto' como CN (nombre del servicio)
# Pero también incluimos la IP original si es una IP
if is_ipv4 "$EXTRACTED_HOST"; then
  # Si es IP, usamos 'mosquitto' como CN (para Docker) y agregamos ambos en SAN
  CN="mosquitto"
  USE_DNS_AND_IP=true
else
  # Si es hostname, lo usamos directamente
  CN="$EXTRACTED_HOST"
  USE_DNS_AND_IP=false
fi

SERVER_CNF="$CERT_DIR/server_openssl.cnf"
cat > "$SERVER_CNF" <<EOF
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[ dn ]
C  = $C
ST = $ST
L  = $L
O  = $O
OU = Server
CN = $CN

[ req_ext ]
subjectAltName      = @alt_names
keyUsage            = digitalSignature, keyEncipherment
extendedKeyUsage    = serverAuth

[ alt_names ]
$( if [ "$USE_DNS_AND_IP" = "true" ]; then
     echo "DNS.1 = mosquitto"
     echo "IP.1  = $EXTRACTED_HOST"
   else
     echo "DNS.1 = $EXTRACTED_HOST"
   fi )
EOF

echo "🔐 Generando Server Key/CSR/CRT..."
openssl req -nodes -sha256 -new \
  -keyout "$SERVER_DIR/server.key" \
  -out    "$SERVER_DIR/server.csr" \
  -config "$SERVER_CNF"

openssl x509 -req -sha256 \
  -in      "$SERVER_DIR/server.csr" \
  -CA      "$CA_DIR/ca.crt" \
  -CAkey   "$CA_DIR/ca.key" \
  -CAcreateserial \
  -out     "$SERVER_DIR/server.crt" \
  -days    "$DAYS" \
  -extensions req_ext -extfile "$SERVER_CNF"

rm -f "$SERVER_DIR/server.csr"

# ============== 3) CLIENT certs (por device) ==============
CLIENT_CNF="$CERT_DIR/client_openssl.cnf"
cat > "$CLIENT_CNF" <<EOF
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[ dn ]
C  = $C
ST = $ST
L  = $L
O  = $O
OU = Device
CN = __DEVICE_ID__

[ req_ext ]
keyUsage            = digitalSignature, keyEncipherment
extendedKeyUsage    = clientAuth
EOF

emit_client() {
  local dev="$1"
  local outdir="$CLIENTS_DIR/$dev"
  mkdir -p "$outdir"

  # generar CSR con CN = device_id
  sed "s/__DEVICE_ID__/$dev/g" "$CLIENT_CNF" > "$outdir/._tmp_client.cnf"

  echo "👤 Emite client cert para: $dev"
  openssl req -new -nodes -sha256 \
    -keyout "$outdir/client.key" \
    -out    "$outdir/client.csr" \
    -config "$outdir/._tmp_client.cnf"

  openssl x509 -req -sha256 \
    -in      "$outdir/client.csr" \
    -CA      "$CA_DIR/ca.crt" \
    -CAkey   "$CA_DIR/ca.key" \
    -CAcreateserial \
    -out     "$outdir/client.crt" \
    -days    "$DAYS" \
    -extensions req_ext -extfile "$outdir/._tmp_client.cnf"

  rm -f "$outdir/client.csr" "$outdir/._tmp_client.cnf"
}

echo "📦 Emisión de clientes..."
for dev in $DEVICES; do
  emit_client "$dev"
done

# ============== 4) (Opcional) CRL inicial ==============
if [[ ! -f "$CA_DIR/crl.pem" ]]; then
  echo "🧾 Generando CRL inicial..."
  openssl ca -gencrl -keyfile "$CA_DIR/ca.key" -cert "$CA_DIR/ca.crt" -out "$CA_DIR/crl.pem" 2>/dev/null || true
fi

# ============== 5) Resumen ==============
echo "✅ Hecho."
echo "CA:          $CA_DIR/ca.crt"
echo "Server CRT:  $SERVER_DIR/server.crt"
echo "Server KEY:  $SERVER_DIR/server.key"
echo "Clients en:  $CLIENTS_DIR/{backend_smca,nodo01,...}"
