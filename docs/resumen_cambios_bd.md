# 📋 Resumen de Cambios en la Base de Datos

## ✅ Cambios Implementados

### 1. **Modelo Dispositivo** (`backend/src/db/Dispositivo.js`)

**Agregado:**
- ✅ `ubicacion: { lat: Number, lng: Number }` - **Requerido**
- ✅ `ultimaLectura: Date` - Para tracking rápido
- ✅ `parametrosSoportados: [String]` - Lista de parámetros que el dispositivo puede medir

**Eliminado:**
- ❌ `nombreEmpresa` - Redundante (se obtiene vía `empresa`)

**Índices:**
- `sensorId` (único)
- `empresa` (para filtrado rápido)
- `{ empresa: 1, estado: 1 }` (compuesto)
- `zona` (para búsquedas por zona)

---

### 2. **Modelo Lectura** (`backend/src/db/Lectura.js`)

**Cambio Principal: Bucket Pattern + Atributos Dinámicos**

**Antes:**
```javascript
{
  pm25: Number,
  pm10: Number,
  co2: Number,
  // ... campos fijos
}
```

**Ahora:**
```javascript
{
  valores: Map<String, Number>  // ⭐ Atributos dinámicos
}
```

**Agregado:**
- ✅ `empresaId: ObjectId` - **Requerido** (para queries rápidas sin joins)
- ✅ `dispositivoId: ObjectId` - Referencia a Dispositivo
- ✅ `valores: Map<String, Number>` - Parámetros ambientales dinámicos
- ✅ `version: String` - Versión del firmware
- ✅ `calidad: Number` - Calidad de la lectura (0-100)
- ✅ `metadata: { tipo, fuente }` - Metadatos adicionales

**Índices:**
- `sensorId` + `timestamp` (compuesto)
- `empresaId` + `timestamp` (compuesto)
- `timestamp` (para ordenamiento)
- `valores.pm25`, `valores.pm10`, `valores.co2` (para queries específicas)

---

### 3. **MQTT Client** (`backend/src/mqtt/mqttClient.js`)

**Mejoras:**
- ✅ Valida que el `sensorId` exista en Dispositivo antes de guardar
- ✅ Extrae `empresaId` automáticamente desde Dispositivo
- ✅ Convierte payload JSON a `valores: Map`
- ✅ Actualiza `ultimaLectura` y `estado` del dispositivo
- ✅ Manejo de errores mejorado

**Flujo:**
```
MQTT → Validar sensorId → Obtener Dispositivo → Extraer empresaId → 
Convertir a Map → Guardar Lectura → Actualizar Dispositivo
```

---

### 4. **Controlador de Lecturas** (`backend/src/controllers/lectura.controller.js`)

**Mejoras:**
- ✅ Filtrado por `empresaId` según el rol del usuario
- ✅ Conversión de `Map` a objeto para JSON
- ✅ Nueva función `obtenerPorSensor()`
- ✅ Populate de `dispositivoId` para obtener nombre y ubicación

**Filtrado por Rol:**
- `superadmin`: Ve todas las lecturas
- `admin` / `supervisor`: Solo ve lecturas de su empresa

---

### 5. **Rutas de Lecturas** (`backend/src/routes/lectura.routes.js`)

**Agregado:**
- ✅ Middleware de autenticación en todas las rutas
- ✅ Nueva ruta: `GET /api/lecturas/sensor/:sensorId`

---

### 6. **Controlador de Dispositivos** (`backend/src/controllers/dispositivo.controller.js`)

**Actualizado:**
- ✅ `crearDispositivo()`: Requiere `ubicacion: { lat, lng }`
- ✅ `editarDispositivo()`: Permite actualizar `ubicacion` y `parametrosSoportados`
- ✅ Eliminado `nombreEmpresa` del proceso de creación

---

## 📊 Estructura de Datos

### Ejemplo de Lectura (Nuevo Formato)

```javascript
{
  _id: ObjectId("..."),
  sensorId: "esp32-001",
  empresaId: ObjectId("..."),
  dispositivoId: ObjectId("..."),
  timestamp: ISODate("2026-01-18T23:00:00Z"),
  zona: "Zona A",
  valores: {
    pm25: 25.5,
    pm10: 30.2,
    co2: 450,
    temperatura: 22.3,
    humedad: 65.0
  },
  calidad: 95,
  metadata: {
    tipo: "telemetria",
    fuente: "mqtt"
  }
}
```

### Ejemplo de Dispositivo (Nuevo Formato)

```javascript
{
  _id: ObjectId("..."),
  sensorId: "esp32-001",
  nombre: "Sensor Principal",
  zona: "Zona A",
  empresa: ObjectId("..."),
  ubicacion: {
    lat: -34.603722,
    lng: -58.381592
  },
  descripcion: "Sensor de calidad del aire",
  estado: "activo",
  fechaRegistro: ISODate("2026-01-01T00:00:00Z"),
  ultimaLectura: ISODate("2026-01-18T23:00:00Z"),
  parametrosSoportados: ["pm25", "pm10", "co2", "temperatura", "humedad"]
}
```

---

## 🔄 Migración de Datos Existentes

Si tienes datos existentes, necesitarás migrarlos. Ver `backend/scripts/migrate-lecturas.js` (por crear).

---

## 🧪 Próximos Pasos

1. ✅ Estructura de BD actualizada
2. ⏳ Crear script de migración (si hay datos existentes)
3. ⏳ Crear script de simulación de datos
4. ⏳ Actualizar frontend para manejar `valores` como objeto
5. ⏳ Probar con datos reales

---

## 📝 Notas Importantes

### Compatibilidad con Frontend

El frontend actual espera campos como `pm25`, `pm10`, etc. directamente en el objeto. Ahora estos están en `valores.pm25`, `valores.pm10`, etc.

**Solución:** El controlador ya convierte `Map` a objeto, pero el frontend debe actualizarse para usar `lectura.valores.pm25` en lugar de `lectura.pm25`.

### Payload MQTT Esperado

El nuevo `mqttClient.js` acepta ambos formatos:

**Formato antiguo (compatible):**
```json
{
  "sensorId": "esp32-001",
  "zona": "Zona A",
  "pm25": 25.5,
  "pm10": 30.2,
  "co2": 450
}
```

**Formato nuevo (recomendado):**
```json
{
  "sensorId": "esp32-001",
  "zona": "Zona A",
  "timestamp": "2026-01-18T23:00:00Z",
  "pm25": 25.5,
  "pm10": 30.2,
  "co2": 450,
  "temperatura": 22.3,
  "calidad": 95
}
```
