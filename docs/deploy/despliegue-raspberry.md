# Primer despliegue en Raspberry Pi (SMCA)

Guía para preparar la Raspberry Pi OS Lite y levantar el stack **MongoDB + Mosquitto + backend** con Docker Compose, y dejar listo el bootstrap del superadmin. El **frontend** se documenta al final (build estático + Nginx/Caddy).

**Requisitos:** SSH al equipo, usuario con permisos `sudo`, Raspberry Pi 3 o superior (1 GB RAM es justo; conviene swap activo).

---

## 0. Tras `apt update` y `apt upgrade`

```bash
sudo reboot
```

Volver a entrar por SSH antes de seguir.

---

## 1. Herramientas básicas

```bash
sudo apt install -y git curl ca-certificates gnupg
```

---

## 2. Docker y Docker Compose

Instalación recomendada (Docker Engine + plugin Compose):

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

**Cerrar sesión SSH y volver a entrar** (o ejecutar `newgrp docker`) para que aplique el grupo `docker`.

Comprobar:

```bash
docker --version
docker compose version
```

---

## 3. Directorio del proyecto

```bash
sudo mkdir -p /opt/smca
sudo chown "$USER:$USER" /opt/smca
cd /opt/smca
```

---

## 4. Código fuente

```bash
git clone <URL-de-tu-repositorio> .
# o: git clone <URL> smca && cd smca
git checkout main   # o el tag/rama estable (ej. v1.0.0)
```

---

## 5. Configuración y secretos

### 5.1 Archivo `backend/.env`

Crear `backend/.env` (no se sube a Git). Debe existir **antes** del `docker build` porque el `Dockerfile` del backend copia `.env` en la imagen.

Variables mínimas (ajustar según tu entorno; el código usa `MONGODB_URI`):

| Variable | Ejemplo (Docker Compose, servicios en la misma red) |
|----------|-----------------------------------------------------|
| `PORT` | `3000` |
| `MONGODB_URI` | `mongodb://mongo:27017/smca` |
| `JWT_SECRET` | Ver sección Generación (hex largo) |
| `APP_TIMEZONE` | `America/Argentina/Buenos_Aires` |
| `MQTT_HOST` | `mqtts://mosquitto:8883` |
| `MQTT_TOPIC` | `iot/aire/lectura` |
| `MQTT_TOPIC_LWT` | `iot/aire/status` |
| `CLIENT_ID` | `backend_smca` |
| `CA_CERT` / `CLIENT_CERT` / `CLIENT_KEY` | Rutas **dentro del contenedor** hacia los certificados montados (ver `docker-compose.yml`: `./backend/certs` → `/app/certs`, `./mqtt/certs` → `/mqtt/certs`) |

Referencia de ejemplo en el repo: [`backend/env`](../../backend/env) (renombrar/adaptar a `MONGODB_URI` si el ejemplo usa otro nombre).

**Generar `JWT_SECRET`:**

```bash
openssl rand -hex 32
```

Pegar el resultado en `backend/.env`.

58b56bff94cbdee4c4a80c705534a9296b2d6d8922f8ac750d350ff6f3b9a9a5

**Permisos:**

```bash
chmod 600 backend/.env
```

### 5.2 Certificados MQTT (TLS)

- Generar o copiar la jerarquía bajo `mqtt/certs/` (según [`mqtt/generate_certs_v2.sh`](../../mqtt/generate_certs_v2.sh) y variables en `.env.local`).
- Alinear **ACL** (`mqtt/config/acl`) y **passwords** (`mqtt/config/passwords`) con el CN de cada cliente (`backend_smca`, nodos ESP32, etc.).
- Documentación de conexión ESP32: [`docs/informacion_conexion_mqtt_esp32.md`](../informacion_conexion_mqtt_esp32.md).

El `docker-compose.yml` monta:

- `./mqtt/config` → `/mosquitto/config`
- `./mqtt/certs` → `/mosquitto/certs`
- `./backend/certs` → `/app/certs` (para el cliente backend)

Asegurar que las rutas en `backend/.env` apunten a los archivos correctos dentro del contenedor (por ejemplo certificados del cliente en `/app/certs` o `/mqtt/certs` según cómo los montes).

---

## 6. Levantar la stack

Desde la **raíz del repositorio** (donde está `docker-compose.yml`):

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f --tail=50
```

Revisar que **mongo**, **mosquitto** y **backend** arranquen sin errores de conexión (Mongo y MQTT).

---

## 7. Usuario superadmin (bootstrap inicial)

La imagen del backend **no incluye** por defecto la carpeta `scripts/` en `/app`. Opciones:

**Opción A – Copiar el script al contenedor y ejecutarlo**

```bash
docker compose exec backend mkdir -p /app/scripts
docker cp backend/scripts/create-admin.js backend:/app/scripts/
docker compose exec backend node /app/scripts/create-admin.js
```

**Opción B – Ejecutar en el host** (con Mongo publicado en `localhost:27017`):

```bash
cd backend
MONGODB_URI=mongodb://127.0.0.1:27017/smca node scripts/create-admin.js
```

Credenciales por defecto del script: ver [`backend/scripts/create-admin.js`](../../backend/scripts/create-admin.js) (`super@smca.com` / contraseña por defecto). **Cambiar la contraseña** tras el primer login.

---

## 8. Frontend (producción)

En la Raspberry o en tu máquina de desarrollo:

```bash
cd frontend
npm ci
npm run build
```

Servir la carpeta `dist/` con **Nginx** o **Caddy**, con proxy de `/api` al backend (`http://127.0.0.1:3000` o el nombre del servicio) y configurar la URL base del API en el build (variable `VITE_*` según el proyecto).

Si solo se valida el backend por ahora, se puede posponer Nginx y probar con `curl` o Postman contra `http://<IP-de-la-Pi>:3000`.

---

## 9. Firewall (opcional, cuando definas qué exponer)

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# Solo si MQTT debe ser accesible desde fuera de la LAN (mejor VPN):
# sudo ufw allow 8883/tcp
sudo ufw enable
```

---

## 10. Comprobaciones rápidas

| Qué | Comando / acción |
|-----|------------------|
| Contenedores | `docker compose ps` |
| Backend | `curl -s http://127.0.0.1:3000/` (o ruta que exponga) |
| Mongo | `docker compose exec mongo mongosh smca --eval "db.stats()"` |
| Espacio | `df -h` |
| RAM | `free -h` |

---

## Pi con 1 GB de RAM

Mongo + Mosquitto + Node consume bastante. Si aparecen **OOM** o reinicios del kernel:

- Revisar `docker compose logs`.
- Considerar `mem_limit` en Compose o datos de Mongo en otro host (Atlas) en entornos más exigentes.

---

## Documentación relacionada

- [Arquitectura de software](../arquitectura_software.md)
- [Información de conexión MQTT ESP32](../informacion_conexion_mqtt_esp32.md)
- [README scripts Air IoT](../../backend/scripts/README-Air-IoT.md)

---

**Última revisión:** febrero 2026
