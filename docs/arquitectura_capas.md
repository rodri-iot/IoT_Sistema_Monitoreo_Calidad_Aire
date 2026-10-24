# Arquitectura de Software SMCA por Capas

## 3.1. Diseno general del sistema IoT

El Sistema de Monitoreo de Calidad de Aire (SMCA) sigue una arquitectura modular y desacoplada, organizada por capas funcionales. Esta organizacion permite separar responsabilidades, facilitar el mantenimiento y habilitar la evolucion independiente de cada modulo.

La arquitectura se estructura en seis capas:

1. Percepcion y adquisicion (firmware en ESP32)
2. Comunicacion y transporte (MQTT sobre TLS)
3. Procesamiento y logica de negocio (backend)
4. Persistencia de datos (MongoDB)
5. Presentacion y visualizacion (frontend web)
6. Infraestructura y despliegue (AWS + DNS + CDN)

```mermaid
flowchart TB
  subgraph capa1 ["Capa1_PercepcionAdquisicion"]
    esp32Node["ESP32 + Sensores\n(firmware en repositorio separado)"]
  end

  subgraph capa2 ["Capa2_ComunicacionTransporte"]
    mqttBroker["Mosquitto Broker\nMQTT sobre TLS (8883)\nmTLS + ACL + passwords"]
  end

  subgraph capa3 ["Capa3_ProcesamientoBackend"]
    backendApi["Node.js + Express\nCliente MQTT + API REST\nJWT + SSE + AQI"]
  end

  subgraph capa4 ["Capa4_PersistenciaDatos"]
    mongoAtlas["MongoDB Atlas\nMongoose ODM"]
  end

  subgraph capa5 ["Capa5_PresentacionVisualizacion"]
    frontendSpa["React SPA\nRecharts + Materialize\nAuth por roles"]
  end

  subgraph capa6 ["Capa6_InfraestructuraDespliegue"]
    awsInfra["EC2 + Docker Compose\nS3 + CloudFront + ACM\nCaddy + Hostinger DNS"]
  end

  esp32Node -->|"MQTTS 8883"| mqttBroker
  mqttBroker -->|"Suscripcion backend"| backendApi
  backendApi -->|"Mongoose"| mongoAtlas
  frontendSpa -->|"HTTPS /api + SSE"| backendApi
```

### Tabla resumen de capas

| Capa | Tecnologias principales | Responsabilidad | Ubicacion de despliegue |
|---|---|---|---|
| Percepcion | ESP32 + sensores (PMS7003, CJMCU-4541, SCD40) | Captura de variables ambientales y envio de telemetria | Dispositivo edge |
| Comunicacion | Mosquitto 2.0, MQTT, TLS/mTLS | Transporte seguro de mensajes pub/sub | EC2 (contenedor Docker) |
| Procesamiento | Node.js, Express, mqtt.js, JWT, SSE | Ingesta MQTT, reglas de negocio, API REST, eventos en tiempo real | EC2 (contenedor Docker) |
| Persistencia | MongoDB Atlas, Mongoose | Almacenamiento de entidades y lecturas historicas | MongoDB Atlas |
| Presentacion | React, Vite, Recharts, Materialize | Visualizacion, gestion y monitoreo web | S3 + CloudFront |
| Infraestructura | AWS EC2, S3, CloudFront, ACM, Hostinger DNS | Orquestacion, disponibilidad, seguridad HTTPS y ruteo | AWS + Hostinger |

## 3.2. Diseno e implementacion del firmware (ESP32)

El firmware se mantiene en un repositorio independiente del backend/frontend. Esta separacion refuerza la modularidad del sistema y permite ciclos de desarrollo diferentes para software embebido y software de plataforma.

### Funciones del modulo embebido

- Inicializacion de conectividad Wi-Fi.
- Conexion segura al broker MQTT con `mqtts://<host>:8883`.
- Carga de `ca.crt`, `client.crt` y `client.key`.
- Simulacion y/o adquisicion real de sensores.
- Publicacion periodica de telemetria en formato JSON.
- Definicion de mensaje LWT para estado del dispositivo.

### Estructura de mensaje de telemetria

Ejemplo de payload publicado por un nodo:

```json
{
  "sensorId": "esp32-air-001",
  "timestamp": "2026-03-27T21:53:54Z",
  "pm25": 26.00,
  "pm10": 27.00,
  "co": 0.00,
  "no2": 0.000,
  "nh3": 0.000,
  "tvoc": 0
}
```

## 3.3. Diseno e implementacion del backend

El backend funciona como capa de integracion central. Expone API REST para frontend, consume mensajes MQTT desde Mosquitto y persiste resultados en MongoDB Atlas.

### Componentes principales

- **Servidor Express**: entrada de la aplicacion, middlewares, montaje de rutas y arranque.
- **Cliente MQTT**: suscripcion a topicos de telemetria y estado, procesamiento de mensajes.
- **Capa de autenticacion/autorizacion**: JWT + control de roles (`superadmin`, `admin`, `supervisor`).
- **Capa de persistencia**: modelos Mongoose y acceso a base de datos.
- **Canal de tiempo real**: endpoint SSE para actualizaciones de lecturas/estado.
- **Servicios de negocio**: calculo AQI y job de inactividad de dispositivos.

### Flujo interno de ingesta MQTT

```mermaid
flowchart LR
  mqttMsg["Mensaje MQTT"] --> validateSensor["Validar sensorId en DB"]
  validateSensor --> normalizeVals["Normalizar valores"]
  normalizeVals --> calcAqi["Calcular AQI"]
  calcAqi --> saveReading["Guardar Lectura"]
  saveReading --> updateDevice["Actualizar Dispositivo"]
  updateDevice --> emitSse["Emitir evento SSE"]
```

### Endpoints REST por dominio

- **Autenticacion**: `POST /api/login`
- **Empresas**: `POST /api/empresas`, `GET /api/empresas/admin/empresas`
- **Usuarios**: `GET/POST /api/usuarios`, `PUT/DELETE /api/usuarios/:id`, `GET /api/usuarios/me`
- **Zonas**: `GET /api/zonas/publicas`, `GET/POST/PUT/DELETE /api/zonas`
- **Dispositivos**: `GET/POST/PUT/DELETE /api/dispositivos`
- **Lecturas**: endpoints de ultimas, desde, agregadas, estadisticas y picos
- **Publico**: endpoints `/api/publico/*`
- **SSE**: `GET /api/sse/lecturas?token=<jwt>`

## 3.4. Diseno e implementacion del frontend web

El frontend es una SPA React compilada con Vite. Su funcion es presentar informacion de monitoreo, permitir administracion por rol y mostrar datos en tiempo real.

### Caracteristicas tecnicas

- React 18 + React Router 6
- Materialize CSS para UI
- Recharts para visualizacion de series y metricas
- Luxon para manejo de fechas y zona horaria
- `AuthContext` para gestion de sesion y token JWT
- `ThemeContext` para cambio de tema

### Patron de comunicacion

- Peticiones HTTP con `fetch` a rutas relativas `/api/...`
- En desarrollo, Vite usa proxy hacia el backend
- En produccion, CloudFront reenvia `/api/*` al origen del backend
- SSE para actualizaciones de lecturas y estados sin polling agresivo

### Seguridad y control de acceso

Las vistas privadas se protegen con `RequireAuth` y una matriz de roles permitidos por ruta.

## 3.5. Diseno de la base de datos

La persistencia se implementa con MongoDB Atlas y Mongoose. El modelo prioriza flexibilidad para soportar parametros ambientales variables y consultas historicas/agregadas.

### Modelos principales

- `Empresa`
- `Usuario`
- `Zona`
- `Dispositivo`
- `Lectura`

```mermaid
erDiagram
  Empresa ||--o{ Usuario : tiene
  Empresa ||--o{ Zona : contiene
  Empresa ||--o{ Dispositivo : administra
  Empresa ||--o{ Lectura : agrupa
  Zona ||--o{ Dispositivo : ubica
  Zona ||--o{ Lectura : clasifica
  Dispositivo ||--o{ Lectura : genera

  Empresa {
    string nombre
  }

  Usuario {
    string correo
    string rol
    objectId empresa
  }

  Zona {
    string nombre
    objectId empresaId
    bool esPublica
  }

  Dispositivo {
    string sensorId
    string estado
    objectId empresa
    objectId zonaId
    date ultimaLectura
  }

  Lectura {
    string sensorId
    objectId empresaId
    objectId dispositivoId
    objectId zonaId
    map valores
    number aqi
    date timestamp
  }
```

### Criterios de diseno de datos

- El campo `valores` en `Lectura` usa tipo `Map` para admitir sensores/parametros heterogeneos.
- Se incluyen indices por `sensorId`, `timestamp`, `empresaId` y campos de consulta frecuente.
- Se conserva separacion entre datos operativos (dispositivo actual) e historicos (coleccion de lecturas).

## 3.6. Comunicacion IoT

La comunicacion IoT se basa en MQTT con seguridad TLS mutua.

### Configuracion de seguridad aplicada

- Listener MQTT seguro: puerto `8883`
- `require_certificate true` (mTLS obligatorio)
- `use_identity_as_username true` (CN del certificado como usuario MQTT)
- `allow_anonymous false`
- `password_file` y `acl_file` activos

### Topicos

- Topico legacy de lecturas: `iot/aire/lectura`
- Topico de estado/LWT: `iot/aire/status`
- Jerarquia por usuario/dispositivo: `smca/%u/#` y topicos derivados

### Secuencia TLS + MQTT

```mermaid
sequenceDiagram
  participant mqttClient as ClienteESP32Backend
  participant mqttServer as BrokerMosquitto

  Note over mqttClient,mqttServer: FaseTLS
  mqttClient->>mqttServer: ClientHello
  mqttServer->>mqttClient: ServerHello + certificado servidor
  mqttClient->>mqttClient: Verifica CA y hostname
  mqttClient->>mqttServer: Certificado cliente + key exchange
  mqttServer->>mqttServer: Valida certificado cliente

  Note over mqttClient,mqttServer: FaseMQTT
  mqttClient->>mqttServer: CONNECT (clientId + credenciales)
  mqttServer->>mqttServer: Evalua usuario CN + password + ACL
  mqttServer->>mqttClient: CONNACK
  mqttClient->>mqttServer: PUBLISH/SUBSCRIBE
  mqttServer->>mqttServer: Autoriza cada topico por ACL
```

## 3.7. Despliegue del sistema en la nube

El sistema se despliega con una arquitectura distribuida entre servicios AWS y componentes externos de DNS.

```mermaid
flowchart LR
  userWeb["Usuario navegador"] --> dnsHostinger["Hostinger DNS"]
  dnsHostinger --> cloudfrontDist["CloudFront\nair.mydatavibe.com"]
  cloudfrontDist --> s3Bucket["S3 Bucket\nfrontend estatico"]
  cloudfrontDist --> apiDomain["smca.mydatavibe.com"]
  apiDomain --> caddyTls["Caddy HTTPS 443 en EC2"]
  caddyTls --> backendSvc["Backend Node.js :3000"]
  backendSvc --> atlasDb["MongoDB Atlas"]
  mqttDevice["ESP32"] --> mqttBrokerEc2["Mosquitto :8883 en EC2"]
  mqttBrokerEc2 --> backendSvc
```

### Componentes de despliegue

- **EC2**: ejecuta Docker Compose con backend y broker MQTT.
- **S3**: alojamiento estatico del frontend compilado.
- **CloudFront**: CDN y terminacion TLS del frontend; enruta `/api/*` al backend.
- **MongoDB Atlas**: base de datos gestionada externa a EC2.
- **Hostinger**: gestion de dominio y registros DNS.
- **Caddy en EC2**: terminacion TLS y reverse proxy para API backend.

## 3.8. Integracion del sistema y pruebas modulares

La integracion sigue el flujo extremo a extremo desde adquisicion hasta visualizacion.

```mermaid
sequenceDiagram
  participant espNode as ESP32
  participant brokerNode as Mosquitto
  participant backendNode as Backend
  participant dbNode as MongoDBAtlas
  participant uiNode as Frontend

  espNode->>brokerNode: Publica lectura JSON (MQTTS)
  brokerNode->>backendNode: Entrega mensaje suscrito
  backendNode->>backendNode: Valida + calcula AQI
  backendNode->>dbNode: Inserta lectura y actualiza dispositivo
  uiNode->>backendNode: Consulta REST /api/lecturas/*
  backendNode->>uiNode: Respuesta JSON
  backendNode-->>uiNode: Evento SSE de lectura/estado
```

### Enfoque de pruebas modulares

- **Firmware**: verificacion de conexion MQTT, publicacion periodica y formato de payload.
- **Broker MQTT**: validacion de autenticacion mTLS, credenciales y reglas ACL por topico.
- **Backend**: pruebas de rutas REST, autenticacion JWT, ingesta MQTT y calculo AQI.
- **Persistencia**: validacion de modelos, indices y consultas agregadas.
- **Frontend**: pruebas funcionales por vista, roles y comportamiento de SSE.
- **Integracion E2E**: trazabilidad de lectura desde ESP32 hasta dashboard.

El repositorio incluye scripts en `backend/scripts/` para simulacion de datos, validacion de conectividad MQTT y carga de datos iniciales, lo que facilita la verificacion modular e integrada.

## 3.9. Consideraciones de escalabilidad y mantenimiento

### Escalabilidad

1. **Escalado horizontal del frontend**: resuelto por naturaleza estatica en S3 + CloudFront.
2. **Escalado de base de datos**: delegable en MongoDB Atlas mediante tiers y configuraciones administradas.
3. **Escalado de backend**: posible mediante multiples instancias y balanceo, manteniendo API stateless con JWT.
4. **Escalado de dispositivos**: el patron pub/sub de MQTT simplifica crecimiento de nodos de adquisicion.

### Mantenibilidad

1. **Separacion por capas y repositorios**: firmware y plataforma evolucionan con bajo acoplamiento.
2. **Contratos claros de integracion**: topicos MQTT y payload JSON bien definidos.
3. **Seguridad centralizada**: certificados, ACL, roles y JWT como politicas explicitas.
4. **Observabilidad operativa**: logs de broker, backend y contenedores para diagnostico.

### Evolucion futura recomendada

- Incorporar pruebas automatizadas E2E continuas.
- Incorporar metricas y alertas centralizadas.
- Evaluar migracion de SSE a WebSocket en escenarios de mayor concurrencia bidireccional.
- Externalizar broker MQTT en arquitectura altamente disponible si aumenta la carga operativa.

## Conclusion

El SMCA presenta una arquitectura modular por capas, coherente con practicas de sistemas IoT modernos. La separacion de responsabilidades entre adquisicion, comunicacion, procesamiento, persistencia, visualizacion e infraestructura permite justificar academicamente el diseno adoptado y soporta crecimiento tecnico futuro sin redisenar el sistema completo.
