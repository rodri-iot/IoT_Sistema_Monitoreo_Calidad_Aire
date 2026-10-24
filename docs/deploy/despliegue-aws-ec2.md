# Despliegue en AWS EC2 + MongoDB Atlas (SMCA)

Guia para continuar el despliegue cuando ya tienes:

- Cuenta AWS creada con MFA y alertas de billing.
- Region fija (`us-east-1`).
- Instancia EC2 creada.
- Elastic IP asociada a la instancia.
- MongoDB Atlas M0 creado con usuario y red permitida.
- Subdominio `smca.mydatavibe.com` configurado en Hostinger.

---

## 0. Verificacion rapida del DNS

Antes de entrar por SSH, confirma que `smca.mydatavibe.com` apunta a tu Elastic IP.

En tu PC local:

```bash
dig +short smca.mydatavibe.com
```

Debe devolver la IP elastica de EC2.

> Nota: para backend/API conviene usar un registro **A** (apuntar a IP), no una redireccion web tipo 301.

---

## 1. Conectarte por SSH a EC2 (si, este es el siguiente paso)

Si tu key se llama `smca-kp-01.pem`:

```bash
chmod 400 /ruta/a/smca-kp-01.pem
ssh -i /ruta/a/smca-kp-01.pem ubuntu@<ELASTIC_IP>
```

Si usaste Amazon Linux, el usuario suele ser `ec2-user`:

```bash
ssh -i /ruta/a/smca-kp-01.pem ec2-user@<ELASTIC_IP>
```

---

## 2. Preparar servidor (Docker + Compose)

En Ubuntu:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates gnupg
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker
docker --version
docker compose version
```

---

## 3. Clonar proyecto en EC2

```bash
sudo mkdir -p /opt/smca
sudo chown "$USER:$USER" /opt/smca
cd /opt/smca
git clone <URL_DEL_REPO> .
git checkout main
```

---

## 4. Configurar `backend/.env` para Atlas

Crear `backend/.env` en EC2 con valores de produccion.

Minimo recomendado:

```dotenv
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
MQTT_HOST=mqtts://mosquitto:8883
MQTT_TOPIC=iot/aire/lectura
MQTT_TOPIC_LWT=iot/aire/status
CLIENT_ID=backend_smca
CA_CERT=/mqtt/certs/ca/ca.crt
CLIENT_CERT=/mqtt/certs/clients/backend_smca/client.crt
CLIENT_KEY=/mqtt/certs/clients/backend_smca/client.key
APP_TIMEZONE=America/Argentina/Buenos_Aires
JWT_SECRET=<generar_con_openssl_rand_hex_32>
```

Generar `JWT_SECRET`:

```bash
openssl rand -hex 32
```

Permisos:

```bash
chmod 600 backend/.env
```

---

## 5. Certificados MQTT y permisos en EC2

Guia detallada (generacion con `generate_certs_v2.sh`, SAN `mosquitto` + dominio, `passwords`/`acl`, UID 1883, directorios `755`, errores frecuentes): **[certificados-mqtt-y-permisos.md](./certificados-mqtt-y-permisos.md)**.

Resumen de archivos que deben existir en el servidor:

- `mqtt/certs/ca/ca.crt`
- `mqtt/certs/server/server.crt`
- `mqtt/certs/server/server.key`
- `mqtt/certs/clients/backend_smca/client.crt`
- `mqtt/certs/clients/backend_smca/client.key`

Tambien revisar:

- `mqtt/config/mosquitto.conf`
- `mqtt/config/passwords`
- `mqtt/config/acl`

Si Mosquitto muestra `Permission denied` sobre `ca.crt`, `server.key` o `passwords`, es casi siempre **permisos o bit de ejecucion faltante en directorios** en el host; segui la guia enlazada arriba.

---

## 6. Levantar contenedores

```bash
cd /opt/smca
docker compose up -d --build
docker compose ps
docker compose logs -f --tail=100
```

Esperado:

- `backend` en estado `Up`.
- `mosquitto` en estado `Up`.
- Sin reinicios de `mosquitto` por `server.key`.
- Sin errores de conexion a Mongo Atlas.

---

## 7. HTTPS para `smca.mydatavibe.com`

Frontend estatico en **`air.mydatavibe.com`** (S3 + CloudFront, Vite, `VITE_API_URL`): ver [despliegue-frontend-s3-cloudfront.md](./despliegue-frontend-s3-cloudfront.md).

Si, debes usar HTTPS para el backend publicado.

Recomendado:

1. Exponer backend solo internamente (por ejemplo `3000`).
2. Instalar Nginx o Caddy en EC2.
3. Emitir certificado TLS con Let's Encrypt para `smca.mydatavibe.com`.
4. Publicar solo `443` (y opcionalmente `80` para redireccion).

### Opcion rapida con Caddy (simple)

Caddy gestiona TLS automatico para el dominio:

- `smca.mydatavibe.com` -> proxy a `localhost:3000` (o al puerto publicado del backend).

Guia paso a paso (incluye el punto clave de que el servicio de Caddy lee `/etc/caddy/Caddyfile`, no el `Caddyfile` del repo): **[https-443-backend-caddy.md](./https-443-backend-caddy.md)**.

---

## 8. Security Group sugerido

- `22/tcp`: solo tu IP.
- `80/tcp`: abierto (si usas emision/renovacion HTTP de cert).
- `443/tcp`: abierto.
- `8883/tcp`: abierto para clientes MQTT (idealmente restringido por origen cuando sea posible).

---

## 9. Checklist final

- [ ] `smca.mydatavibe.com` apunta a Elastic IP (registro A).
- [ ] Puedes entrar por SSH a EC2.
- [ ] Docker y Compose instalados.
- [ ] `backend/.env` en EC2 con `MONGODB_URI` de Atlas.
- [ ] Certificados MQTT presentes y con permisos correctos.
- [ ] `docker compose up -d --build` estable.
- [ ] HTTPS activo para `smca.mydatavibe.com`.

---

## Problemas comunes

- **Atlas no conecta**: IP de EC2 no permitida en Network Access o URI mal formada.
- **Mosquitto reinicia**: `server.key` no legible por el proceso del contenedor.
- **Dominio no responde**: DNS aun propagando o registro mal configurado.
- **Cert HTTPS no emite**: dominio no apunta a la instancia correcta o puerto 80 bloqueado.
