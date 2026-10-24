# Certificados MQTT (mTLS) y permisos en el servidor

Esta guía describe cómo generar la PKI con el script del repositorio, qué valida TLS en Docker y cómo fijar permisos en el host para que **Mosquitto** y el **backend** lean los archivos montados sin `Permission denied`.

Para el flujo completo EC2 + Atlas, véase también [despliegue-aws-ec2.md](./despliegue-aws-ec2.md).

---

## 1. Qué archivos intervienen

| Ubicación | Uso |
|-----------|-----|
| `mqtt/certs/ca/ca.crt`, `ca.key` | CA interna; el broker usa `ca.crt` para verificar clientes (mTLS). |
| `mqtt/certs/server/server.crt`, `server.key` | Certificado TLS del listener `8883` en Mosquitto. |
| `mqtt/certs/clients/<id>/client.crt`, `client.key` | Un par por dispositivo (nodos + `backend_smca`). |
| `backend/certs/` | Copia usada por el contenedor backend (`CA_CERT`, `CLIENT_CERT`, `CLIENT_KEY` en `backend/.env`). |
| `mqtt/config/passwords`, `mqtt/config/acl` | Autenticación por contraseña y ACL (además del certificado de cliente). |

El `docker-compose.yml` monta `mqtt/config` y `mqtt/certs` en el contenedor Mosquitto **solo lectura** (`:ro`).

---

## 2. Configurar `.env.local` (raíz del repo, junto a `mqtt/`)

El script `mqtt/generate_certs_v2.sh` lee **`../.env.local`** (desde `mqtt/`). Variables relevantes:

```dotenv
# Dominio público del broker (SAN del certificado de servidor) o IP de prueba
MQTT_HOST=smca.ejemplo.com

CERT_DAYS=365

# CN de cada certificado de cliente (incluir backend_smca y todos los nodos)
DEVICES="backend_smca nodo01 nodo02 ..."
```

- **`MQTT_HOST`**: puede ser un FQDN (`smca.ejemplo.com`), una IPv4, o una URL tipo `mqtts://host:8883` (el script extrae el host).
- **`DEVICES`**: lista separada por espacios; cada valor es el **CN** del certificado de cliente y, con `use_identity_as_username`, el usuario MQTT.

---

## 3. Generar o regenerar certificados

Desde el directorio **`mqtt/`**:

```bash
cd mqtt
chmod +x generate_certs_v2.sh   # si hace falta
./generate_certs_v2.sh
```

- La **CA** solo se crea si no existen `mqtt/certs/ca/ca.crt` y `ca.key`. Para una CA nueva, borrá manualmente esos archivos (implica reemitir **todos** los clientes).
- El script **siempre** regenera el certificado de **servidor** y los certificados de **cliente** listados en `DEVICES`.

### 3.1 SAN del servidor y Docker Compose

El backend en Compose se conecta a `mqtts://mosquitto:8883`: el nombre TLS que valida Node es **`mosquitto`**, no el dominio público.

El script actual emite el certificado de servidor con:

- **Hostname (no IP):** `DNS.1 = mosquitto`, `DNS.2 = <MQTT_HOST>` (FQDN público).
- **IPv4:** `DNS.1 = mosquitto`, `IP.1 = <IP>`.

Así el mismo `server.crt` sirve para clientes externos (dominio o IP) y para el backend dentro de la red Docker.

Comprobar el resultado:

```bash
openssl x509 -in mqtt/certs/server/server.crt -noout -subject -ext subjectAltName
```

### 3.2 Copiar el cliente del backend

Tras generar, copiá el par del backend hacia `backend/certs` (rutas relativas típicas en `backend/.env`):

```bash
cp mqtt/certs/ca/ca.crt backend/certs/
cp mqtt/certs/clients/backend_smca/client.crt backend/certs/
cp mqtt/certs/clients/backend_smca/client.key backend/certs/
```

En el contenedor también podés montar `mqtt/certs` y apuntar `CA_CERT` / `CLIENT_*` a `/mqtt/certs/...` (véase la guía EC2).

---

## 4. `passwords` y `acl`

- Generá entradas con `mosquitto_passwd` en el host (desde el directorio `mqtt/` o con rutas absolutas al archivo).
- El fichero `mqtt/config/passwords` debe listar usuarios coherentes con el CN de cada cliente y con `mqtt/config/acl`.

---

## 5. Permisos en el host (Linux / EC2)

Dentro del contenedor, Mosquitto suele ejecutarse con el usuario numérico **UID 1883** (imagen `eclipse-mosquitto`). Los bind mounts **conservan uid/gid del host**: si `server.key` es `600` y solo lo lee `ubuntu` (1000), el proceso 1883 recibe **Permission denied**.

### 5.1 Enfoque recomendado: dueño 1883 en claves y config sensible

Desde la raíz del proyecto en el servidor:

```bash
# UID del usuario mosquitto en la imagen (confirmar: docker run --rm eclipse-mosquitto:2.0 id mosquitto)
MOSQ_UID=1883

sudo chown "$MOSQ_UID:$MOSQ_UID" mqtt/certs/server/server.key mqtt/certs/ca/ca.key
sudo chmod 600 mqtt/certs/server/server.key mqtt/certs/ca/ca.key

sudo chmod 644 mqtt/certs/ca/ca.crt mqtt/certs/server/server.crt

sudo chown "$MOSQ_UID:$MOSQ_UID" mqtt/config/passwords mqtt/config/acl
sudo chmod 600 mqtt/config/passwords mqtt/config/acl
```

Los `.crt` pueden quedar `644` y dueño `ubuntu` si preferís editar con tu usuario; lo crítico es que **1883 pueda leer** `ca.crt`, `server.crt` y `server.key`.

### 5.2 Directorios: bit de ejecución (`x`)

Un directorio debe tener permiso de **entrada** (`x`) para poder listar o abrir archivos dentro. Si ves `drw-r--r--` (falta `x`), ni siquiera el dueño puede hacer `ls` adentro:

```bash
sudo find mqtt/certs -type d -exec chmod 755 {} \;
```

Luego ajustá archivos:

```bash
sudo find mqtt/certs -type f -name '*.crt' -exec chmod 644 {} \;
sudo find mqtt/certs -type f -name '*.key' -exec chmod 600 {} \;
```

y volvé a aplicar `chown 1883` sobre las claves que deba leer Mosquitto (`server.key`, `ca.key`).

### 5.3 Backend (`backend/certs`)

El contenedor Node suele correr con UID **1000** (`node`/`ubuntu`). Si `client.key` es `600` y dueño `ubuntu:ubuntu`, suele funcionar en EC2. Si hubiera denegación de lectura, alineá dueño o grupo con el UID efectivo del proceso en el contenedor (`docker compose exec backend id`).

---

## 6. Mensajes habituales en logs

| Mensaje | Significado |
|---------|-------------|
| `chown: ... Read-only file system` | El entrypoint intenta cambiar dueño sobre volúmenes `:ro`. Suele ser **inocuo** si el broker puede leer los archivos. |
| `Unable to open pwfile` / `passwords` | El usuario del proceso no puede leer `mqtt/config/passwords`. Corregir `chown`/`chmod` (apartado 5.1). |
| `Unable to load CA certificates` / `ca.crt` | Mismo problema de permisos o directorio sin `x`. |
| `Unable to load server key file` / `server.key` | Casi siempre `server.key` con `600` solo para otro UID; usar `chown 1883` o política equivalente. |
| `Warning: File ... passwords has world readable` | Mosquitto recomienda `600` y dueño `mosquitto`; aplicar 5.1. |

---

## 7. Checklist antes de `docker compose up`

- [ ] `mqtt/certs/` con directorios `755` y sin permisos rotos en `ca/`, `server/`, `clients/`.
- [ ] `ca.crt`, `server.crt` legibles por el proceso del broker; `ca.key` y `server.key` con dueño/perms adecuados (p. ej. 1883 + `600`).
- [ ] `passwords` y `acl` legibles solo por el usuario del broker (`600`, dueño 1883).
- [ ] `backend/certs/` actualizado con CA y cliente `backend_smca` si usás rutas locales.
- [ ] `MQTT_HOST=mqtts://mosquitto:8883` en `backend/.env` y SAN del servidor incluye `mosquitto` (script actual).

---

## 8. Referencias en el código

- Script de generación: `mqtt/generate_certs_v2.sh`
- Compose: `docker-compose.yml` (volúmenes `mqtt/config`, `mqtt/certs`, `backend/certs`)
- Cliente MQTT Node: `backend/src/mqtt/mqttClient.js` (`rejectUnauthorized`, rutas de certificados desde env)
