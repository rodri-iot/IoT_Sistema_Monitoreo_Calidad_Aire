# 📚 Explicación Completa del Sistema de Gestión de Dispositivos

## 🎯 Concepto Principal

**El ESP32 solo necesita conocer su `sensorId`. El backend se encarga de asociar los datos a la empresa correcta.**

---

## 🔄 Flujo Completo del Sistema

### 1️⃣ Registro del Dispositivo (Una Vez - Por Admin)

**Quién**: Admin o Superadmin desde el frontend

**Qué hace**:
```
Admin crea dispositivo:
  - sensorId: "esp32-air-001"
  - nombre: "Sensor Principal"
  - empresa: ObjectId("empresa_air_iot")  ← Asociado a Air IoT
  - zona: "Planta A"
  - ubicacion: { lat: -34.60, lng: -58.38 }
```

**Resultado en BD**:
```javascript
Dispositivo {
  _id: ObjectId("..."),
  sensorId: "esp32-air-001",
  empresa: ObjectId("empresa_air_iot"),  // ⭐ Clave para asociación
  zona: "Planta A",
  ...
}
```

---

### 2️⃣ ESP32 Envía Datos por MQTT (Continuamente)

**Quién**: El ESP32 (o script de simulación)

**Qué envía**:
```json
{
  "sensorId": "esp32-air-001",  // ⭐ Solo esto identifica al dispositivo
  "pm25": 25.5,
  "pm10": 30.2,
  "co2": 450,
  "temperatura": 22.3,
  "humedad": 65.0
}
```

**Lo que el ESP32 NO envía**:
- ❌ `empresaId` (el backend lo obtiene del dispositivo)
- ❌ `dispositivoId` (el backend lo obtiene del dispositivo)
- ❌ `zona` (opcional, se toma del dispositivo si no está)

**Tópico MQTT**: `iot/aire/lectura`

---

### 3️⃣ Backend Recibe y Procesa (Automático)

**Código**: `backend/src/mqtt/mqttClient.js`

**Proceso detallado**:

```javascript
// 1. Backend recibe mensaje MQTT
client.on('message', async (topic, message) => {
  const rawData = JSON.parse(message.toString())
  // rawData = { sensorId: "esp32-air-001", pm25: 25.5, ... }
  
  // 2. Busca el dispositivo por sensorId
  const dispositivo = await Dispositivo.findOne({ 
    sensorId: rawData.sensorId  // "esp32-air-001"
  })
  
  // 3. Si NO existe → IGNORA la lectura
  if (!dispositivo) {
    logger(`⚠️ Dispositivo ${rawData.sensorId} no encontrado. Ignorando.`)
    return  // ⚠️ La lectura se descarta
  }
  
  // 4. Si existe → Obtiene empresaId del dispositivo
  const empresaId = dispositivo.empresa  // ObjectId("empresa_air_iot")
  
  // 5. Extrae valores ambientales (solo números)
  const valores = new Map()
  Object.keys(rawData).forEach(key => {
    if (key !== 'sensorId' && typeof rawData[key] === 'number') {
      valores.set(key, rawData[key])
    }
  })
  // valores = Map { pm25: 25.5, pm10: 30.2, co2: 450, ... }
  
  // 6. Crea y guarda la lectura
  const lectura = new Lectura({
    sensorId: "esp32-air-001",
    empresaId: dispositivo.empresa,      // ⭐ Obtenido del dispositivo
    dispositivoId: dispositivo._id,       // ⭐ Obtenido del dispositivo
    valores: valores,                     // ⭐ Valores del ESP32
    timestamp: new Date(),
    zona: rawData.zona || dispositivo.zona
  })
  
  await lectura.save()
  
  // 7. Actualiza el dispositivo
  dispositivo.ultimaLectura = new Date()
  dispositivo.estado = 'activo'
  await dispositivo.save()
})
```

**Punto clave**: El backend **resuelve** la empresa automáticamente buscando el dispositivo.

---

### 4️⃣ Usuario Consulta Lecturas (Filtrado Automático)

**Código**: `backend/src/controllers/lectura.controller.js`

**Proceso**:

```javascript
// 1. Usuario hace petición
GET /api/lecturas/ultimas
Headers: { Authorization: "Bearer <token>" }

// 2. Backend verifica token y extrae empresaId
const token = jwt.verify(req.headers.authorization)
// token = { id: "...", correo: "admin@airiot.com", empresaId: ObjectId("empresa_air_iot") }

// 3. Construye filtro según rol
let filter = {}
if (req.user.rol !== 'superadmin') {
  filter.empresaId = req.user.empresaId  // ⭐ Solo lecturas de su empresa
}

// 4. Consulta MongoDB
const lecturas = await Lectura.find(filter)
  .sort({ timestamp: -1 })
  .limit(20)

// 5. Retorna solo lecturas de la empresa del usuario
res.json(lecturas)
```

**Resultado**: El usuario solo ve lecturas de su empresa, automáticamente.

---

## 📊 Ejemplo Completo: Empresa "Air IoT"

### Escenario Inicial

**Empresa**: "Air IoT" (ObjectId: `empresa_air_iot`)
**Usuario**: `admin@airiot.com` (empresa: `empresa_air_iot`)

### Paso 1: Registrar Dispositivos

```javascript
// Admin crea dispositivo 1
POST /api/dispositivos
{
  sensorId: "esp32-air-001",
  nombre: "Sensor Principal",
  empresa: ObjectId("empresa_air_iot"),
  zona: "Planta A",
  ubicacion: { lat: -34.60, lng: -58.38 }
}

// Admin crea dispositivo 2
POST /api/dispositivos
{
  sensorId: "esp32-air-002",
  nombre: "Sensor Secundario",
  empresa: ObjectId("empresa_air_iot"),
  zona: "Planta B",
  ubicacion: { lat: -34.61, lng: -58.39 }
}
```

### Paso 2: ESP32 Envían Datos

```javascript
// ESP32-001 envía (cada 2 segundos)
MQTT Publish: iot/aire/lectura
{
  "sensorId": "esp32-air-001",
  "pm25": 25.5,
  "pm10": 30.2,
  "co2": 450,
  "temperatura": 22.3,
  "humedad": 65.0
}

// ESP32-002 envía (cada 2 segundos)
MQTT Publish: iot/aire/lectura
{
  "sensorId": "esp32-air-002",
  "pm25": 18.3,
  "pm10": 25.1,
  "no2": 45.2,
  "co2": 420,
  "temperatura": 21.5,
  "humedad": 58.0
}
```

### Paso 3: Backend Procesa

```javascript
// Lectura 1 (de ESP32-001)
Lectura {
  sensorId: "esp32-air-001",
  empresaId: ObjectId("empresa_air_iot"),  // ← Obtenido del Dispositivo
  dispositivoId: ObjectId("dispositivo_001"),
  valores: { pm25: 25.5, pm10: 30.2, co2: 450, ... }
}

// Lectura 2 (de ESP32-002)
Lectura {
  sensorId: "esp32-air-002",
  empresaId: ObjectId("empresa_air_iot"),  // ← Obtenido del Dispositivo
  dispositivoId: ObjectId("dispositivo_002"),
  valores: { pm25: 18.3, pm10: 25.1, no2: 45.2, ... }
}
```

### Paso 4: Usuario Consulta

```javascript
// Usuario: admin@airiot.com (empresa: empresa_air_iot)
GET /api/lecturas/ultimas
Authorization: Bearer <token_con_empresaId>

// Backend filtra:
Lectura.find({ empresaId: ObjectId("empresa_air_iot") })

// Usuario ve:
[
  { sensorId: "esp32-air-001", valores: { pm25: 25.5, ... } },
  { sensorId: "esp32-air-002", valores: { pm25: 18.3, ... } }
]
```

---

## ✅ Ventajas de este Diseño

### Para el ESP32:
- ✅ **Simplicidad**: Solo necesita conocer su `sensorId`
- ✅ **Seguridad**: No conoce información sensible (empresaId)
- ✅ **Flexibilidad**: Puede cambiar de empresa sin modificar código

### Para el Backend:
- ✅ **Validación**: Solo acepta lecturas de dispositivos registrados
- ✅ **Asociación Automática**: No requiere lógica adicional
- ✅ **Seguridad**: Dispositivos no registrados no pueden enviar datos

### Para los Usuarios:
- ✅ **Privacidad**: Solo ven datos de su empresa
- ✅ **Automatismo**: El filtrado es transparente
- ✅ **Escalabilidad**: Fácil agregar nuevas empresas

---

## ⚠️ Puntos Críticos

### 1. El Dispositivo DEBE Estar Registrado

**Si el ESP32 envía datos con un `sensorId` no registrado**:
```
❌ Backend: "⚠️ Dispositivo esp32-unknown no encontrado. Ignorando lectura."
❌ Resultado: La lectura NO se guarda
✅ Solución: Registrar el dispositivo primero
```

### 2. El sensorId Debe Coincidir Exactamente

**Correcto**:
- Dispositivo registrado: `esp32-air-001`
- ESP32 envía: `"sensorId": "esp32-air-001"` ✅

**Incorrecto**:
- Dispositivo registrado: `esp32-air-001`
- ESP32 envía: `"sensorId": "ESP32-AIR-001"` ❌ (mayúsculas)
- ESP32 envía: `"sensorId": "esp32_air_001"` ❌ (guión bajo)
- ESP32 envía: `"sensorId": "esp32-air-002"` ❌ (diferente)

### 3. El Usuario Debe Estar Asociado a la Empresa

**Token JWT debe incluir `empresaId`**:
```javascript
// Al hacer login, el backend genera:
token = {
  id: usuario._id,
  correo: usuario.correo,
  rol: usuario.rol,
  empresaId: usuario.empresa._id  // ⭐ Debe estar presente
}
```

**Si el token no tiene `empresaId`**:
- El usuario no verá lecturas (filtro vacío o error)

**Solución**: Cerrar sesión y volver a iniciar sesión después de crear/actualizar la empresa.

---

## 🔧 Script de Simulación Mejorado

He creado `backend/scripts/simulate-esp32.js` que:

1. ✅ Simula exactamente lo que haría un ESP32
2. ✅ Solo envía `sensorId` y valores ambientales
3. ✅ No necesita conocer la empresa
4. ✅ Valida certificados antes de conectar
5. ✅ Muestra progreso en tiempo real

**Uso**:
```bash
# Simular ESP32 con sensorId específico
SENSOR_ID=esp32-air-001 node scripts/simulate-esp32.js

# Con más lecturas
SENSOR_ID=esp32-air-001 NUM_READINGS=50 node scripts/simulate-esp32.js
```

---

## 📝 Resumen para Implementar en ESP32 Real

**Lo que el ESP32 necesita**:

1. **Configuración**:
   ```cpp
   const char* SENSOR_ID = "esp32-air-001";  // Debe estar registrado
   const char* MQTT_BROKER = "mqtts://192.168.1.6:8883";
   const char* MQTT_TOPIC = "iot/aire/lectura";
   ```

2. **Certificados TLS**:
   - CA Certificate
   - Client Certificate (CN puede ser cualquier cosa, no necesariamente el sensorId)
   - Client Private Key

3. **Formato del mensaje**:
   ```json
   {
     "sensorId": "esp32-air-001",
     "pm25": 25.5,
     "pm10": 30.2,
     "co2": 450
   }
   ```

4. **Publicar cada X segundos**:
   ```cpp
   mqtt_client.publish(MQTT_TOPIC, payload, qos=1);
   ```

**Eso es todo**. El backend se encarga del resto.
