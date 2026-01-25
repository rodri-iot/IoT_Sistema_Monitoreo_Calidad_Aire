# 📡 Flujo de Gestión de Dispositivos y Lecturas

## 🎯 Resumen del Sistema

El sistema funciona de la siguiente manera:

1. **Registro de Dispositivos**: Los dispositivos se registran en la BD **antes** de enviar datos
2. **Envío MQTT**: El ESP32 solo necesita enviar su `sensorId` y los valores ambientales
3. **Asociación Automática**: El backend busca el dispositivo por `sensorId` y obtiene su `empresaId`
4. **Almacenamiento**: La lectura se guarda con `empresaId` y `dispositivoId`
5. **Filtrado por Usuario**: Los usuarios solo ven lecturas de su empresa

---

## 🔄 Flujo Completo Paso a Paso

### Paso 1: Registro del Dispositivo (Una vez)

**Quién lo hace**: Admin/Superadmin desde el frontend o API

**Qué se guarda**:
```javascript
{
  sensorId: "esp32-air-001",  // ⭐ ID único que identifica al ESP32
  nombre: "Sensor Principal",
  zona: "Planta A",
  empresa: ObjectId("..."),    // ⭐ Asociado a una empresa
  ubicacion: { lat: -34.60, lng: -58.38 },
  parametrosSoportados: ["pm25", "pm10", "co2", "temperatura", "humedad"]
}
```

**Importante**: El `sensorId` debe ser único y coincidir con el que envía el ESP32.

---

### Paso 2: ESP32 Envía Datos por MQTT

**Quién lo hace**: El ESP32 (o script de simulación)

**Qué envía**:
```json
{
  "sensorId": "esp32-air-001",  // ⭐ Debe coincidir con el registrado
  "zona": "Planta A",            // Opcional (se toma del dispositivo si no está)
  "timestamp": "2026-01-18T23:00:00Z",  // Opcional (se usa Date.now() si no está)
  "pm25": 25.5,
  "pm10": 30.2,
  "co2": 450,
  "temperatura": 22.3,
  "humedad": 65.0
}
```

**Tópico MQTT**: `iot/aire/lectura` (legacy) o `smca/{usuario}/private/{dispositivo}/telemetry/data`

**Autenticación**: Certificado TLS con CN que coincida con el `sensorId` (o usar certificado genérico)

---

### Paso 3: Backend Recibe y Procesa

**Código**: `backend/src/mqtt/mqttClient.js`

**Proceso**:

```javascript
1. Recibe mensaje MQTT en tópico "iot/aire/lectura"
2. Parsea JSON: { sensorId: "esp32-air-001", pm25: 25.5, ... }
3. Busca Dispositivo: Dispositivo.findOne({ sensorId: "esp32-air-001" })
4. Si NO existe → ⚠️ Ignora la lectura (log de advertencia)
5. Si existe → Continúa:
   a. Extrae empresaId: dispositivo.empresa
   b. Extrae valores numéricos: { pm25: 25.5, pm10: 30.2, ... }
   c. Crea Lectura:
      {
        sensorId: "esp32-air-001",
        empresaId: dispositivo.empresa,  // ⭐ Asociado automáticamente
        dispositivoId: dispositivo._id,
        valores: Map { pm25: 25.5, pm10: 30.2, ... },
        timestamp: new Date(),
        zona: rawData.zona || dispositivo.zona
      }
   d. Guarda en MongoDB
   e. Actualiza dispositivo: ultimaLectura = ahora, estado = 'activo'
```

**Punto clave**: El backend **NO necesita** que el ESP32 envíe el `empresaId`. Lo obtiene automáticamente del dispositivo registrado.

---

### Paso 4: Usuario Consulta Lecturas

**Código**: `backend/src/controllers/lectura.controller.js`

**Proceso**:

```javascript
1. Usuario hace GET /api/lecturas/ultimas
2. Backend verifica token JWT
3. Extrae empresaId del token: req.user.empresaId
4. Si es superadmin → No filtra (ve todas)
5. Si es admin/supervisor → Filtra: { empresaId: req.user.empresaId }
6. Consulta MongoDB: Lectura.find(filter).sort({ timestamp: -1 })
7. Retorna solo lecturas de su empresa
```

**Punto clave**: El filtrado es automático. Los usuarios solo ven datos de su empresa.

---

## 🔐 Asociación Dispositivo → Empresa

### ¿Cómo se asocia un dispositivo a una empresa?

**Al crear el dispositivo** (Paso 1):
- El admin/superadmin especifica a qué empresa pertenece
- Se guarda: `dispositivo.empresa = ObjectId("empresa_air_iot")`

### ¿Cómo se asocia una lectura a una empresa?

**Automáticamente** (Paso 3):
- El backend busca el dispositivo por `sensorId`
- Obtiene: `dispositivo.empresa`
- Guarda: `lectura.empresaId = dispositivo.empresa`

**No requiere** que el ESP32 sepa a qué empresa pertenece.

---

## 📊 Ejemplo Completo

### Escenario: Empresa "Air IoT" tiene 2 dispositivos

**1. Registro de Dispositivos** (Admin):
```javascript
Dispositivo 1: {
  sensorId: "esp32-air-001",
  empresa: ObjectId("empresa_air_iot"),
  zona: "Planta A"
}

Dispositivo 2: {
  sensorId: "esp32-air-002",
  empresa: ObjectId("empresa_air_iot"),
  zona: "Planta B"
}
```

**2. ESP32 envía datos**:
```json
// ESP32-001 envía:
{ "sensorId": "esp32-air-001", "pm25": 25.5, "pm10": 30.2 }

// ESP32-002 envía:
{ "sensorId": "esp32-air-002", "pm25": 18.3, "co2": 450 }
```

**3. Backend procesa**:
```javascript
// Lectura 1:
{
  sensorId: "esp32-air-001",
  empresaId: ObjectId("empresa_air_iot"),  // ← Obtenido del Dispositivo
  valores: { pm25: 25.5, pm10: 30.2 }
}

// Lectura 2:
{
  sensorId: "esp32-air-002",
  empresaId: ObjectId("empresa_air_iot"),  // ← Obtenido del Dispositivo
  valores: { pm25: 18.3, co2: 450 }
}
```

**4. Usuario de Air IoT consulta**:
```javascript
// GET /api/lecturas/ultimas
// Token incluye: { empresaId: ObjectId("empresa_air_iot") }

// Backend filtra:
Lectura.find({ empresaId: ObjectId("empresa_air_iot") })

// Usuario ve: Ambas lecturas (001 y 002)
```

**5. Usuario de otra empresa consulta**:
```javascript
// GET /api/lecturas/ultimas
// Token incluye: { empresaId: ObjectId("otra_empresa") }

// Backend filtra:
Lectura.find({ empresaId: ObjectId("otra_empresa") })

// Usuario ve: [] (ninguna lectura, porque no son de su empresa)
```

---

## ✅ Ventajas de este Diseño

1. **Simplicidad para ESP32**: Solo necesita conocer su `sensorId`
2. **Seguridad**: El ESP32 no necesita saber a qué empresa pertenece
3. **Flexibilidad**: Puedes mover un dispositivo entre empresas cambiando solo el registro
4. **Validación**: Si un `sensorId` no está registrado, la lectura se ignora
5. **Filtrado Automático**: Los usuarios solo ven sus datos sin lógica adicional

---

## ⚠️ Puntos Importantes

### 1. El dispositivo DEBE estar registrado primero

Si el ESP32 envía datos con un `sensorId` que no existe en la BD:
- ❌ La lectura se **ignora**
- ⚠️ Se registra un log de advertencia
- ✅ No se guarda nada en MongoDB

**Solución**: Registrar el dispositivo antes de enviar datos.

### 2. El sensorId debe coincidir exactamente

- `esp32-air-001` ≠ `ESP32-AIR-001` ≠ `esp32_air_001`
- Debe ser **exactamente igual** al registrado

### 3. El usuario debe estar asociado a la empresa

- El token JWT incluye `empresaId`
- Si el usuario no tiene `empresaId`, no verá lecturas
- **Solución**: Cerrar sesión y volver a iniciar sesión después de crear la empresa

---

## 🔧 Gestión de Dispositivos

### Crear Dispositivo (Admin/Superadmin)

**Desde Frontend**: Formulario en `/dispositivos`
**Desde API**: `POST /api/dispositivos`

**Datos requeridos**:
- `sensorId`: ID único del ESP32
- `nombre`: Nombre descriptivo
- `zona`: Zona geográfica
- `empresa`: ObjectId de la empresa
- `ubicacion`: { lat, lng }

### Mover Dispositivo entre Empresas

**Desde API**: `PUT /api/dispositivos/:id`

Cambiar el campo `empresa` del dispositivo. Las lecturas futuras se asociarán a la nueva empresa.

**Nota**: Las lecturas antiguas mantienen su `empresaId` original (histórico).

---

## 📝 Resumen para ESP32

**Lo que el ESP32 necesita saber**:
1. ✅ Su `sensorId` (debe estar registrado en la BD)
2. ✅ URL del broker MQTT: `mqtts://mosquitto:8883` (o IP pública)
3. ✅ Certificados TLS (CA, Client Cert, Client Key)
4. ✅ Tópico: `iot/aire/lectura` (legacy) o `smca/{usuario}/private/{sensorId}/telemetry/data`

**Lo que el ESP32 NO necesita saber**:
- ❌ A qué empresa pertenece
- ❌ El `empresaId`
- ❌ Otros dispositivos del sistema

**Formato del mensaje**:
```json
{
  "sensorId": "esp32-air-001",
  "pm25": 25.5,
  "pm10": 30.2,
  "co2": 450,
  "temperatura": 22.3,
  "humedad": 65.0
}
```

Eso es todo. El backend se encarga del resto.
