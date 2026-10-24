# Arquitectura de software — SMCA

Documento basado en el código y la configuración del repositorio (sin supuestos no verificados).

**Última revisión:** febrero 2026

---

## 1. Vista general

```
[ESP32 / simuladores] --MQTT TLS (8883)--> [Mosquitto]
                                                |
                                                | suscripción (backend)
                                                v
                                         [Node.js / Express]
                                                |
                    +---------------------------+---------------------------+
                    |                           |                           |
              [MongoDB]                   REST /api                    (job 1 min)
           (persistencia)              (JWT + CORS)              (inactividad dispositivos)

[Browser] --HTTP (fetch)--> [Vite dev en :5173] --proxy /api--> [Backend :3000]
```

- **Frontend:** SPA React que habla con el backend solo por **HTTP** (`fetch` a `/api/...`), con proxy en Vite hacia el API.
- **Backend:** un único proceso Node.js que expone **API REST + JWT**, **MongoDB** vía Mongoose y **cliente MQTT** que se suscribe al broker.
- **MQTT:** broker **Eclipse Mosquitto** en Docker; los dispositivos publican; el broker **no** escribe en MongoDB: lo hace el **backend** al recibir mensajes.
- **Base de datos:** **MongoDB** en contenedor, conexión desde el backend con **Mongoose**.

No hay en el código **WebSocket** ni **GraphQL**; la comunicación en tiempo “casi real” de lecturas entra por **MQTT → backend → MongoDB** y la UI consume datos **por REST** (polling / refrescos según cada vista).

---

## 2. Backend

| Aspecto | Implementación |
|--------|----------------|
| **Runtime** | Node.js (imagen Docker `node:18` en `backend/Dockerfile`) |
| **Framework HTTP** | **Express** 4.x (`backend/src/server.js`) |
| **JSON** | `express.json()` + **CORS** habilitado globalmente |
| **Puerto** | `PORT` (default 3000), escucha `0.0.0.0` |
| **Persistencia** | **Mongoose** 7.x → MongoDB |
| **MQTT** | Librería **mqtt** 5.x (`backend/src/mqtt/mqttClient.js`) |
| **Autenticación API** | **JWT** (`jsonwebtoken`) + **bcrypt** para contraseñas |
| **Config** | **dotenv** (`require('dotenv').config()` en `server.js`) |

### Rutas montadas

- `auth.routes` → `POST /api/login`
- `empresa.routes` → bajo `/api/empresas`
- `usuario.routes` → bajo `/api`
- `dispositivo.routes` → `/api/dispositivos`
- `zona.routes` → `/api/zonas`
- `lectura.routes` → `/api/lecturas`

### Arranque (`server.js`)

1. `connectDB()` (Mongoose)
2. `connectMQTT()` (cliente MQTT)
3. Job periódico `setInterval` cada **60 s** que marca `Dispositivo` como `inactivo` si `ultimaLectura` > 5 minutos

### Cliente MQTT (`mqttClient.js`)

- Conexión con `mqtt.connect(process.env.MQTT_HOST, options)` con TLS: `ca`, `cert`, `key` desde archivos (`CA_CERT`, `CLIENT_CERT`, `CLIENT_KEY`).
- `rejectUnauthorized: true`.
- Suscripción a `MQTT_TOPIC` (lecturas) y `MQTT_TOPIC_LWT` (LWT / estado offline).
- Al recibir lectura: valida `sensorId` en `Dispositivo`, arma `valores` (Map), calcula AQI con `utils/aqiCalculator.js`, guarda `Lectura`, actualiza dispositivo.

### Variable de entorno MongoDB

`backend/src/db/connection.js` usa **`process.env.MONGODB_URI`**. El archivo de ejemplo `backend/env` puede mostrar `MONGO_URI`; el código efectivo espera **`MONGODB_URI`** (como en `backend/.env`).

---

## 3. Base de datos

| Aspecto | Implementación |
|--------|----------------|
| **Motor** | **MongoDB 6** (`image: mongo:6` en `docker-compose.yml`) |
| **Base** | `smca` (ej. `mongodb://mongo:27017/smca` en `MONGODB_URI`) |
| **ODM** | **Mongoose** |

### Modelos en uso (`backend/src/db/`)

- `Empresa.js`
- `Usuario.js`
- `Zona.js`
- `Dispositivo.js`
- `Lectura.js`

### Archivos alternativos

`Lectura.v2.js` y `Dispositivo.v2.js` existen pero **no** están referenciados por controllers/rutas actuales (variantes o legado).

### Lecturas

Schema con `valores` tipo **Map** de números (parámetros dinámicos), índices en `sensorId`, `timestamp`, `empresaId`, etc.

### Docker

Volumen `mongo_data` → `/data/db` en el contenedor `mongo`.

---

## 4. MQTT (broker)

| Aspecto | Implementación |
|--------|----------------|
| **Imagen** | `eclipse-mosquitto:2.0` (`mqtt/Dockerfile`) |
| **Puertos en Compose** | `1883` y `8883` mapeados al host |
| **Config** | `mqtt/config/mosquitto.conf` (montado solo lectura) |
| **Listener explícito en conf** | **8883** con `protocol mqtt` y **TLS** |
| **TLS** | `cafile`, `certfile`, `keyfile` bajo `/mosquitto/certs/` |
| **Cliente** | `require_certificate true` (mutual TLS) |
| **Usuario** | `use_identity_as_username true` (CN del certificado como username) |
| **Anónimos** | `allow_anonymous false` |
| **ACL** | `acl_file` + `password_file` (`passwords`) |

**Nota:** El `mosquitto.conf` versionado declara solo el listener **8883**. El mapeo de **1883** en Compose existe; el comportamiento del listener sin TLS depende de la imagen/defaults.

**Certificados:** generación con scripts en `mqtt/` (p. ej. `generate_certs_v2.sh`); artefactos en `mqtt/certs/` (CA, servidor, clientes por dispositivo).

---

## 5. Frontend

| Aspecto | Implementación |
|--------|----------------|
| **Build** | **Vite** 5 + `@vitejs/plugin-react` |
| **UI** | **React** 18 |
| **Routing** | **react-router-dom** 6 (`BrowserRouter`, `Routes`, `Route`) |
| **CSS** | **Materialize CSS** 1.0 + `App.css` |
| **Gráficos** | **Recharts** 3.x |
| **Estado** | **React Context** (`AuthContext`, `ThemeContext`) |
| **Token** | `localStorage` (`token`, `user`); `Authorization: Bearer` vía `fetchWithAuth` |

### API

En desarrollo, **Vite** hace **proxy** de `/api` hacia `VITE_API_URL` o `http://127.0.0.1:3000` (`frontend/vite.config.js`).

### Rutas principales (`frontend/src/App.jsx`)

Login, vista pública, zonas, dispositivos, lecturas (Historico), usuarios, empresas, etc., con `RequireAuth` y roles (`superadmin`, `admin`, `supervisor`).

---

## 6. Orquestación (Docker Compose en la raíz)

Servicios en `docker-compose.yml`:

1. **mongo** — MongoDB 6, red `smca_net`, volumen `mongo_data`.
2. **mosquitto** — build `./mqtt`, certs y config montados.
3. **backend** — build `./backend`, depende de mongo y mosquitto, puerto 3000, volúmenes de certs, `env_file: ./backend/.env`.

**No** hay servicio **frontend** en ese `compose`; el front suele ejecutarse con `npm run dev` (Vite) por separado.

---

## 7. Resumen

**Arquitectura de tres piezas desacopladas:** **Mosquitto (MQTT TLS)** + **MongoDB** + **API REST en Node/Express**, con el **backend como único consumidor MQTT que persiste en MongoDB**; el **frontend React** solo consume la **API REST** y no se conecta al broker MQTT.

---

## Referencias de archivos clave

| Componente | Archivos |
|------------|----------|
| Entrada API | `backend/src/server.js` |
| MQTT | `backend/src/mqtt/mqttClient.js` |
| MongoDB | `backend/src/db/connection.js`, modelos en `backend/src/db/` |
| Auth API | `backend/src/middleware/authMiddleware.js`, `backend/src/controllers/login.controller.js` |
| Broker | `mqtt/config/mosquitto.conf`, `mqtt/Dockerfile` |
| Compose | `docker-compose.yml` |
| Front | `frontend/src/App.jsx`, `frontend/vite.config.js`, `frontend/package.json` |
| Backend deps | `backend/package.json` |

---

## 8. Zona horaria (fechas y agregaciones)

- **Persistencia:** los `timestamp` de lecturas se guardan como `Date` en UTC (instante único).
- **Negocio / UI LATAM:** `APP_TIMEZONE` (backend, IANA, p. ej. `America/Argentina/Buenos_Aires`) define el calendario para `$dateTrunc` en agregaciones (`obtenerAgregadas`). No depende de la región AWS del servidor (p. ej. us-east-1).
- **Frontend:** `VITE_APP_TIMEZONE` debe coincidir con `APP_TIMEZONE` para rangos “desde/hasta” por día y formato `dd/mm/yyyy` en 24 h (`frontend/src/utils/dateTime.js`, Luxon + `Intl`).

---

## 9. AQI: textos de límites en la UI

- El cálculo de AQI en servidor usa **breakpoints EPA** en `backend/src/utils/aqiCalculator.js` (`BREAKPOINTS` para PM2.5, PM10, NO₂, CO).
- En la vista **Monitoreo** (`Historico`), las notas bajo los gráficos de particulado y gases muestran los **topes de la categoría “Buena” (AQI 0–50)** tomados de ese mismo primer tramo.
- Los valores numéricos están duplicados de forma controlada en `frontend/src/utils/aqiEpaReferenceText.js` (`AQI_POLLUTANT_GOOD_MAX`). **Si se cambian los breakpoints en el backend**, hay que actualizar ese archivo (y el componente `AqiPollutantLimitsNote`) para que la UI no contradiga el cálculo.
