# Diseño de la Base de Datos — SMCA

**Sistema de Monitoreo de Calidad de Aire**
Trabajo Final — Maestría en Ingeniería de Sistemas IoT, UBA

---

## 1. Introducción

El sistema utiliza **MongoDB** como base de datos documental. La elección responde a los requisitos propios de una plataforma IoT: alta frecuencia de escrituras, parámetros ambientales variables por dispositivo, y necesidad de escalar horizontalmente sin migraciones costosas de esquema.

| Componente | Detalle |
|---|---|
| Motor | MongoDB 6 |
| ODM | Mongoose 7 (Node.js) |
| Servicio en producción | **MongoDB Atlas** (cloud) |
| Nombre de la base | `smca` |
| Entorno de desarrollo | MongoDB 6 en contenedor Docker (`mongo:6`) |

---

## 2. Conexión a la Base de Datos

### 2.1 Código de conexión

La conexión se establece en [`backend/src/db/connection.js`](../backend/src/db/connection.js) al iniciar el servidor:

```js
const mongoose = require('mongoose');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
}
```

Si la conexión falla, el proceso termina con `process.exit(1)` para evitar que el backend arranque en estado inconsistente.

### 2.2 Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `MONGODB_URI` | URI completa de conexión (requerida) | `mongodb+srv://user:pass@cluster.mongodb.net/smca` |
| `JWT_SECRET` | Secreto para firmar tokens JWT (requerida, no está en `env.example`) | `my_secret_key` |

El archivo [`backend/env.example`](../backend/env.example) define `MONGO_URI` para desarrollo local con Docker (`mongodb://mongo:27017/smca`). El código de conexión usa **`MONGODB_URI`**, por lo que el archivo `.env` de ejecución debe declarar esa variable.

### 2.3 Diferencia entre entornos

```
┌────────────────────────────────────────────────────────────────────────┐
│  Desarrollo (Docker Compose)                                           │
│                                                                        │
│  MONGODB_URI=mongodb://mongo:27017/smca                                │
│  Contenedor mongo:6 definido en docker-compose.yml                     │
│  Datos persistidos en volumen Docker: mongo_data                       │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  Producción (AWS EC2 + MongoDB Atlas)                                  │
│                                                                        │
│  MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/smca   │
│  Conexión con TLS/SSL implícito (Atlas lo gestiona)                    │
│  Sin servicio mongo en el Compose de producción                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Colecciones y Esquemas

La base de datos `smca` contiene **cinco colecciones**. Los modelos Mongoose se definen en `backend/src/db/`.

```
backend/src/db/
├── connection.js    ← inicialización de la conexión
├── Empresa.js       → colección: empresas
├── Usuario.js       → colección: usuarios
├── Zona.js          → colección: zonas
├── Dispositivo.js   → colección: dispositivos
└── Lectura.js       → colección: lecturas
```

---

### 3.1 Empresa (`empresas`)

Entidad raíz del modelo multi-tenant. Cada empresa agrupa sus propios usuarios, zonas, dispositivos y lecturas de forma aislada.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `_id` | ObjectId | PK automático | Identificador único |
| `nombre` | String | `required` | Nombre de la empresa |
| `usuarios` | [ObjectId] | ref: `Usuario` | Array de referencias a usuarios de la empresa |

```js
// backend/src/db/Empresa.js
{
  nombre: { type: String, required: true },
  usuarios: [{ type: ObjectId, ref: 'Usuario' }]
}
```

> No tiene `timestamps`. No tiene índices adicionales más allá del `_id` automático.

---

### 3.2 Usuario (`usuarios`)

Representa a los usuarios que acceden al dashboard. El rol determina el nivel de acceso en el sistema.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `_id` | ObjectId | PK automático | Identificador único |
| `correo` | String | `required`, `unique` | Email de acceso |
| `password` | String | `required` | Hash bcrypt de la contraseña |
| `rol` | String | enum: `admin`, `supervisor`, `superadmin` | Nivel de permisos |
| `empresa` | ObjectId | ref: `Empresa` | Empresa a la que pertenece |

```js
// backend/src/db/Usuario.js
{
  correo:   { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol:      { type: String, enum: ['admin', 'supervisor', 'superadmin'], default: 'admin' },
  empresa:  { type: ObjectId, ref: 'Empresa' }
}
```

> El índice `unique` sobre `correo` es creado automáticamente por Mongoose.

---

### 3.3 Zona (`zonas`)

Agrupa dispositivos dentro de una empresa. Puede ser pública (visible sin autenticación) o privada. Define umbrales AQI propios por zona.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `_id` | ObjectId | PK automático | Identificador único |
| `nombre` | String | `required`, `trim` | Nombre de la zona (ej. "Planta A") |
| `empresaId` | ObjectId | `required`, ref: `Empresa`, indexed | Empresa propietaria |
| `descripcion` | String | default: `''` | Descripción libre |
| `limitesAQI.bueno` | Number | default: `50` | Umbral AQI para calidad buena |
| `limitesAQI.moderado` | Number | default: `100` | Umbral AQI para calidad moderada |
| `limitesAQI.peligroso` | Number | default: `150` | Umbral AQI para nivel peligroso |
| `esPublica` | Boolean | default: `false` | Si aparece en la vista pública |
| `createdAt` | Date | automático (`timestamps: true`) | Fecha de creación |
| `updatedAt` | Date | automático (`timestamps: true`) | Fecha de última modificación |

```js
// backend/src/db/Zona.js
{
  nombre:      { type: String, required: true, trim: true },
  empresaId:   { type: ObjectId, ref: 'Empresa', required: true, index: true },
  descripcion: { type: String, default: '' },
  limitesAQI: {
    bueno:     { type: Number, default: 50 },
    moderado:  { type: Number, default: 100 },
    peligroso: { type: Number, default: 150 }
  },
  esPublica: { type: Boolean, default: false }
}
// Índice compuesto único: una empresa no puede tener dos zonas con el mismo nombre
zonaSchema.index({ empresaId: 1, nombre: 1 }, { unique: true });
```

---

### 3.4 Dispositivo (`dispositivos`)

Representa un sensor físico (ej. ESP32). Mantiene su estado operativo y la referencia a la zona donde está instalado.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `_id` | ObjectId | PK automático | Identificador único |
| `sensorId` | String | `required`, `unique`, indexed | ID físico del sensor (ej. `"esp32-001"`) |
| `nombre` | String | `required` | Nombre descriptivo |
| `zona` | String | `required` | Nombre de la zona (string legacy / MQTT) |
| `zonaId` | ObjectId | ref: `Zona`, default: `null` | Referencia estructurada a la zona |
| `empresa` | ObjectId | `required`, ref: `Empresa`, indexed | Empresa propietaria |
| `ubicacion.lat` | Number | `required` | Latitud GPS |
| `ubicacion.lng` | Number | `required` | Longitud GPS |
| `descripcion` | String | — | Descripción libre |
| `esPublico` | Boolean | default: `false` | Si aparece en la vista pública |
| `estado` | String | enum: `activo`, `inactivo`, `desconocido` | Estado operativo actual |
| `fechaRegistro` | Date | default: `Date.now` | Fecha de alta en el sistema |
| `ultimaLectura` | Date | — | Timestamp de la última lectura recibida |
| `parametrosSoportados` | [String] | — | Parámetros que mide (ej. `['pm25', 'co2']`) |

```js
// backend/src/db/Dispositivo.js
{
  sensorId:   { type: String, required: true, unique: true, index: true },
  nombre:     { type: String, required: true },
  zona:       { type: String, required: true },
  zonaId:     { type: ObjectId, ref: 'Zona', default: null },
  empresa:    { type: ObjectId, ref: 'Empresa', required: true, index: true },
  ubicacion: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  descripcion:           String,
  esPublico:             { type: Boolean, default: false },
  estado:                { type: String, enum: ['activo', 'inactivo', 'desconocido'], default: 'desconocido' },
  fechaRegistro:         { type: Date, default: Date.now },
  ultimaLectura:         Date,
  parametrosSoportados:  [String]
}
dispositivoSchema.index({ empresa: 1, estado: 1 });
dispositivoSchema.index({ zona: 1 });
dispositivoSchema.index({ zonaId: 1 });
```

> `ultimaLectura` y `estado` se actualizan en cada mensaje MQTT recibido. Un job periódico cada 60 segundos marca como `inactivo` todo dispositivo cuyo `ultimaLectura` supere los 5 minutos.

---

### 3.5 Lectura (`lecturas`)

Colección de mayor volumen. Almacena cada telemetría recibida por MQTT. Usa el **Bucket Pattern con Map de atributos dinámicos** para soportar sensores con distintos parámetros sin modificar el esquema.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `_id` | ObjectId | PK automático | Identificador único |
| `sensorId` | String | `required`, indexed | ID del sensor origen |
| `empresaId` | ObjectId | `required`, ref: `Empresa`, indexed | Empresa propietaria (desnormalizado para filtrado rápido) |
| `dispositivoId` | ObjectId | ref: `Dispositivo` | Referencia al dispositivo |
| `timestamp` | Date | `required`, default: `Date.now`, indexed | Momento de la medición |
| `zona` | String | `required` | Nombre de la zona (desnormalizado desde MQTT) |
| `zonaId` | ObjectId | ref: `Zona`, default: `null` | Referencia estructurada a la zona |
| `aqi` | Number | min: `0`, max: `500`, default: `null` | Índice de Calidad del Aire calculado |
| `aqiParametro` | String | default: `null` | Parámetro dominante en el cálculo AQI |
| `valores` | Map\<String, Number\> | `required` | Mediciones ambientales (ver abajo) |
| `version` | String | — | Versión del firmware del sensor |
| `calidad` | Number | min: `0`, max: `100` | Calidad estimada de la lectura (%) |
| `metadata.tipo` | String | enum: `telemetria`, `status`, `evento` | Clasificación del mensaje |
| `metadata.fuente` | String | enum: `mqtt`, `api`, `sync` | Origen del dato |

```js
// backend/src/db/Lectura.js
{
  sensorId:     { type: String, required: true, index: true },
  empresaId:    { type: ObjectId, ref: 'Empresa', required: true, index: true },
  dispositivoId:{ type: ObjectId, ref: 'Dispositivo' },
  timestamp:    { type: Date, default: Date.now, required: true, index: true },
  zona:         { type: String, required: true },
  zonaId:       { type: ObjectId, ref: 'Zona', default: null },
  aqi:          { type: Number, min: 0, max: 500, default: null },
  aqiParametro: { type: String, default: null },
  valores:      { type: Map, of: Number, required: true },
  version:      String,
  calidad:      { type: Number, min: 0, max: 100 },
  metadata: {
    tipo:   { type: String, enum: ['telemetria', 'status', 'evento'], default: 'telemetria' },
    fuente: { type: String, enum: ['mqtt', 'api', 'sync'], default: 'mqtt' }
  }
}
```

**Ejemplo de documento en MongoDB Atlas:**

```json
{
  "_id": "ObjectId('...')",
  "sensorId": "esp32-planta-a-01",
  "empresaId": "ObjectId('...')",
  "dispositivoId": "ObjectId('...')",
  "timestamp": "2026-04-19T14:30:00.000Z",
  "zona": "Planta A",
  "zonaId": "ObjectId('...')",
  "aqi": 72,
  "aqiParametro": "pm25",
  "valores": {
    "pm25": 35.4,
    "pm10": 48.2,
    "co2": 612,
    "temperatura": 23.1,
    "humedad": 58.0
  },
  "calidad": 98,
  "metadata": {
    "tipo": "telemetria",
    "fuente": "mqtt"
  }
}
```

> El campo `valores` es un `Map<String, Number>`: solo se almacenan los parámetros presentes en el mensaje MQTT, sin campos nulos. Esto permite incorporar nuevos tipos de sensores (NO2, TVOC, presión, etc.) sin modificar el esquema.

---

## 4. Diagrama Entidad-Relación

```mermaid
erDiagram
    Empresa {
        ObjectId _id
        String nombre
        ObjectIdArray usuarios
    }
    Usuario {
        ObjectId _id
        String correo
        String password
        String rol
        ObjectId empresa
    }
    Zona {
        ObjectId _id
        String nombre
        ObjectId empresaId
        String descripcion
        Number limitesAQI_bueno
        Number limitesAQI_moderado
        Number limitesAQI_peligroso
        Boolean esPublica
        Date createdAt
        Date updatedAt
    }
    Dispositivo {
        ObjectId _id
        String sensorId
        String nombre
        String zona
        ObjectId zonaId
        ObjectId empresa
        Number ubicacion_lat
        Number ubicacion_lng
        String descripcion
        Boolean esPublico
        String estado
        Date fechaRegistro
        Date ultimaLectura
        StringArray parametrosSoportados
    }
    Lectura {
        ObjectId _id
        String sensorId
        ObjectId empresaId
        ObjectId dispositivoId
        Date timestamp
        String zona
        ObjectId zonaId
        Number aqi
        String aqiParametro
        Map valores
        String version
        Number calidad
        String metadata_tipo
        String metadata_fuente
    }

    Empresa ||--o{ Usuario : "tiene"
    Empresa ||--o{ Zona : "posee"
    Empresa ||--o{ Dispositivo : "registra"
    Empresa ||--o{ Lectura : "almacena"
    Zona ||--o{ Dispositivo : "contiene"
    Zona ||--o{ Lectura : "agrupa"
    Dispositivo ||--o{ Lectura : "genera"
```

### Notas sobre las relaciones

- **Empresa ↔ Usuario**: relación bidireccional. `Empresa.usuarios` contiene el array de ObjectId de sus usuarios, y `Usuario.empresa` apunta a la empresa. Ambos campos deben mantenerse sincronizados en la lógica de la aplicación.
- **Dispositivo.zona (String) vs Dispositivo.zonaId (ObjectId)**: doble referencia por compatibilidad histórica. Los mensajes MQTT incluyen el nombre de zona como string; el backend resuelve y persiste el `zonaId` estructurado.
- **Lectura.empresaId**: campo desnormalizado copiado desde `Dispositivo.empresa` al momento de ingestar la lectura. Permite filtrar lecturas por empresa sin hacer un join con la colección `dispositivos`.

---

## 5. Índices

### 5.1 Colección `empresas`

| Índice | Tipo | Campos |
|---|---|---|
| `_id_` | PK automático | `_id` |

### 5.2 Colección `usuarios`

| Índice | Tipo | Campos |
|---|---|---|
| `_id_` | PK automático | `_id` |
| `correo_1` | Único | `correo` |

### 5.3 Colección `zonas`

| Índice | Tipo | Campos |
|---|---|---|
| `_id_` | PK automático | `_id` |
| `empresaId_1` | Simple | `empresaId` |
| `empresaId_1_nombre_1` | Compuesto, único | `empresaId`, `nombre` |

> La unicidad compuesta garantiza que no existan dos zonas con el mismo nombre dentro de una misma empresa.

### 5.4 Colección `dispositivos`

| Índice | Tipo | Campos |
|---|---|---|
| `_id_` | PK automático | `_id` |
| `sensorId_1` | Único | `sensorId` |
| `empresa_1` | Simple | `empresa` |
| `empresa_1_estado_1` | Compuesto | `empresa`, `estado` |
| `zona_1` | Simple | `zona` |
| `zonaId_1` | Simple | `zonaId` |

### 5.5 Colección `lecturas`

| Índice | Tipo | Campos | Propósito |
|---|---|---|---|
| `_id_` | PK automático | `_id` | — |
| `sensorId_1` | Simple | `sensorId` | Consultas por sensor |
| `empresaId_1` | Simple | `empresaId` | Aislamiento multi-tenant |
| `timestamp_-1` | Simple (desc) | `timestamp` | Orden cronológico |
| `zonaId_1` | Simple | `zonaId` | Consultas por zona |
| `aqi_1` | Simple | `aqi` | Filtros por nivel de calidad |
| `sensorId_1_timestamp_-1` | Compuesto | `sensorId`, `timestamp` | Historial de un sensor |
| `empresaId_1_timestamp_-1` | Compuesto | `empresaId`, `timestamp` | Dashboard por empresa |
| `zonaId_1_timestamp_-1` | Compuesto | `zonaId`, `timestamp` | Historial por zona |
| `valores.pm25_1` | Sobre campo de Map | `valores.pm25` | Queries por parámetro específico |
| `valores.pm10_1` | Sobre campo de Map | `valores.pm10` | Queries por parámetro específico |
| `valores.co2_1` | Sobre campo de Map | `valores.co2` | Queries por parámetro específico |

---

## 6. Patrones de Diseño

### 6.1 Multi-tenant por empresa

Todas las entidades operativas (zonas, dispositivos, lecturas) incluyen una referencia a la empresa propietaria (`empresaId` / `empresa`). El backend filtra todas las consultas por `empresaId` según el token JWT del usuario autenticado, garantizando el aislamiento de datos entre clientes.

```
Usuario autenticado → extrae empresaId del JWT
                    → todas las queries incluyen { empresaId: req.user.empresa }
```

### 6.2 Map de atributos dinámicos en Lectura

El campo `valores` es un `Map<String, Number>` en lugar de campos fijos (`pm25`, `pm10`, `co2`...). Esto permite:

- Almacenar solo los parámetros que el sensor concreto reporta, sin nulos.
- Agregar nuevos tipos de sensores (NO2, TVOC, presión barométrica, etc.) sin alterar el esquema ni migrar datos históricos.
- El cliente MQTT normaliza aliases (`temp` → `temperatura`, `hum` → `humedad`) antes de persistir.

### 6.3 Doble referencia de zona

Los dispositivos y lecturas mantienen dos campos para la zona:

| Campo | Tipo | Uso |
|---|---|---|
| `zona` | String | Nombre plano recibido del mensaje MQTT; fallback legacy |
| `zonaId` | ObjectId | Referencia estructurada; preferida para joins y agregaciones |

Si el dispositivo no tiene `zonaId` al momento de recibir una lectura, el backend lo resuelve automáticamente buscando o creando la zona por nombre dentro de la empresa (lógica en `mqttClient.js`).

### 6.4 Estado de dispositivo y detección de inactividad

El campo `Dispositivo.estado` se gestiona por dos mecanismos:

1. **MQTT LWT (Last Will and Testament)**: cuando un dispositivo se desconecta abruptamente, el broker publica en el tópico `iot/aire/status` y el backend marca el dispositivo como `inactivo`.
2. **Job periódico**: cada 60 segundos, el servidor ejecuta `Dispositivo.updateMany` para marcar como `inactivo` todo dispositivo cuyo `ultimaLectura` sea anterior a 5 minutos.

```
ESP32 desconectado → MQTT LWT → backend recibe en iot/aire/status → Dispositivo.estado = 'inactivo'
                                                                   ↓
                              Job cada 60s: ultimaLectura > 5 min → Dispositivo.estado = 'inactivo'
```

### 6.5 Desnormalización estratégica

`Lectura.empresaId` y `Lectura.zona` se desnormalizan (se copian desde el dispositivo al momento de ingestar) para evitar joins en las consultas más frecuentes del dashboard. Este es un patrón habitual en MongoDB para cargas de lectura intensivas.

---

## 7. Despliegue en AWS y MongoDB Atlas

### 7.1 Arquitectura de producción

```
┌──────────────────────────────────────────────────────────────────┐
│  AWS                                                             │
│                                                                  │
│  ┌──────────────────────────────┐    ┌──────────────────────┐   │
│  │  EC2 (Docker)                │    │  S3 + CloudFront     │   │
│  │  ┌────────────────────────┐  │    │  Frontend React      │   │
│  │  │  backend (Node.js)     │  │    │  (assets estáticos)  │   │
│  │  │  puerto 3000           │  │    └──────────────────────┘   │
│  │  └────────────────────────┘  │                               │
│  │  ┌────────────────────────┐  │                               │
│  │  │  mosquitto (MQTT/TLS)  │  │                               │
│  │  │  puertos 1883 / 8883   │  │                               │
│  │  └────────────────────────┘  │                               │
│  │  ┌────────────────────────┐  │                               │
│  │  │  Caddy (reverse proxy) │  │                               │
│  │  │  TLS automático (ACM)  │  │                               │
│  │  └────────────────────────┘  │                               │
│  └──────────────────────────────┘                               │
└──────────────────────────────────────────────────────────────────┘
                         │
                         │ mongodb+srv (TLS)
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  MongoDB Atlas                                                   │
│  Base de datos: smca                                             │
│  Colecciones: empresas, usuarios, zonas, dispositivos, lecturas  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Consideraciones de configuración en Atlas

- La URI de conexión se inyecta como variable de entorno `MONGODB_URI` en el contenedor del backend en EC2.
- Atlas gestiona TLS/SSL de forma transparente; no se requiere configuración adicional de certificados en el cliente.
- El servicio `mongo:6` del `docker-compose.yml` es exclusivamente para **desarrollo local** y no se utiliza en producción.
- Se recomienda configurar en Atlas: IP Allowlist restringida a la IP elástica de EC2, usuario de base de datos con permisos mínimos sobre la base `smca`, y alertas de capacidad para la colección `lecturas` (mayor volumen de crecimiento).

### 7.3 Consideraciones de crecimiento

La colección `lecturas` es la de mayor crecimiento. Se recomienda evaluar:

- **TTL Index** sobre `timestamp` para purgar lecturas históricas según política de retención:
  ```js
  lecturaSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 }); // 1 año
  ```
- **Atlas Data Tiering** o **Atlas Online Archive** para mover datos fríos a almacenamiento económico sin eliminarlos.
- **Agregaciones pre-computadas** (ej. promedios horarios/diarios) si el volumen de lecturas genera latencia en el dashboard.

---

## 8. Resumen de colecciones

| Colección | Modelo Mongoose | Propósito | Timestamps |
|---|---|---|---|
| `empresas` | `Empresa` | Tenant raíz del sistema | No |
| `usuarios` | `Usuario` | Acceso y autenticación | No |
| `zonas` | `Zona` | Agrupación geográfica de sensores | Sí (`createdAt`, `updatedAt`) |
| `dispositivos` | `Dispositivo` | Registro y estado de sensores físicos | No |
| `lecturas` | `Lectura` | Telemetría ambiental con timestamp manual | No |
