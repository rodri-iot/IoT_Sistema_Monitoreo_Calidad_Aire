# 📡 Estructura de Tópicos MQTT por Empresa/Usuario

## 🎯 Objetivo

Organizar los tópicos MQTT por empresa/usuario para:
- ✅ Privacidad: cada usuario solo ve sus datos
- ✅ Escalabilidad: soporte para múltiples empresas
- ✅ Publicación opcional: permitir hacer datos públicos

## 📊 Estructura Actual

### Modelos de Datos
```
Usuario
  - correo (único)
  - password
  - rol: admin | supervisor | superadmin
  - empresa: ObjectId → Empresa

Empresa
  - nombre
  - usuarios: [ObjectId → Usuario]

Dispositivo
  - sensorId (único)
  - nombre
  - zona
  - empresa: ObjectId → Empresa
  - nombreEmpresa

Lectura
  - sensorId
  - zona
  - timestamp
  - datos ambientales (pm25, pm10, co2, etc.)
  ⚠️ NO tiene relación directa con Empresa
```

### Tópicos MQTT Actuales
```
smca/lab/{deviceId}/telemetry/#    # Donde {deviceId} = CN del certificado
smca/lab/{deviceId}/status/#
smca/lab/{deviceId}/cmd/#
iot/aire/lectura                   # Backend escucha aquí (genérico)
```

## 🏗️ Estructura Propuesta

### Tópicos Privados (por Empresa)
```
smca/empresa/{empresaId}/devices/{sensorId}/telemetry/#
smca/empresa/{empresaId}/devices/{sensorId}/status/#
smca/empresa/{empresaId}/devices/{sensorId}/cmd/#
```

**Ejemplo:**
```
smca/empresa/507f1f77bcf86cd799439011/devices/esp32-001/telemetry/data
smca/empresa/507f1f77bcf86cd799439011/devices/esp32-001/status/online
smca/empresa/507f1f77bcf86cd799439011/devices/esp32-001/cmd/calibrate
```

### Tópicos Públicos (opcional)
```
smca/public/devices/{sensorId}/telemetry/#
smca/public/devices/{sensorId}/status/#
```

**Ejemplo:**
```
smca/public/devices/esp32-001/telemetry/data
smca/public/devices/esp32-001/status/online
```

### Tópico Legacy (compatibilidad)
```
iot/aire/lectura  # Mantener durante migración
```

## 🔐 ACL Propuesto

### Dispositivos ESP32 (publican solo a su empresa)
```
# Pattern para certificados de dispositivos
# CN del certificado = sensorId
pattern write smca/empresa/+/devices/%u/telemetry/#
pattern write smca/empresa/+/devices/%u/status/#
pattern read  smca/empresa/+/devices/%u/cmd/#
```

**Nota:** Los dispositivos publican usando su `sensorId` como CN del certificado, pero el ACL permite publicar a cualquier empresa. **El backend debe validar** que el dispositivo pertenezca a la empresa correcta.

### Backend (lee todo, publica comandos)
```
user backend_smca
# Leer tópicos por empresa
topic read smca/empresa/+/devices/+/telemetry/#
topic read smca/empresa/+/devices/+/status/#
# Publicar comandos a cualquier dispositivo
topic write smca/empresa/+/devices/+/cmd/#
# Leer tópicos públicos
topic read smca/public/devices/+/telemetry/#
topic read smca/public/devices/+/status/#
# Legacy
topic read iot/aire/lectura
```

## 🔄 Cambios Necesarios en el Backend

### 1. Modelo Lectura
**Agregar campo `empresaId`:**
```javascript
const lecturaSchema = new mongoose.Schema({
  sensorId: { type: String, required: true },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa' }, // NUEVO
  zona: { type: String, required: true },
  // ... resto de campos
})
```

**O alternativamente:** Obtener `empresaId` desde `Dispositivo` usando `sensorId`.

### 2. Modelo Dispositivo (opcional - para datos públicos)
```javascript
const dispositivoSchema = new mongoose.Schema({
  // ... campos existentes
  datosPublicos: { type: Boolean, default: false }, // NUEVO
})
```

### 3. Cliente MQTT del Backend
**Cambiar suscripción a tópicos por empresa:**
```javascript
// Suscribirse a todos los tópicos de empresas
client.subscribe('smca/empresa/+/devices/+/telemetry/#', ...)
client.subscribe('smca/public/devices/+/telemetry/#', ...)
client.subscribe('iot/aire/lectura', ...) // Legacy
```

**Procesar mensajes:**
```javascript
client.on('message', async (topic, message) => {
  // Extraer empresaId del tópico: smca/empresa/{empresaId}/devices/{sensorId}/telemetry/...
  const match = topic.match(/smca\/empresa\/([^\/]+)\/devices\/([^\/]+)\//);
  
  if (match) {
    const [, empresaId, sensorId] = match;
    const data = JSON.parse(message.toString());
    
    // Validar que el dispositivo pertenece a esa empresa
    const dispositivo = await Dispositivo.findOne({ sensorId, empresa: empresaId });
    if (!dispositivo) {
      logger('⚠️ Dispositivo no pertenece a esa empresa');
      return;
    }
    
    // Guardar lectura con empresaId
    const lectura = new Lectura({
      ...data,
      empresaId,
      sensorId
    });
    await lectura.save();
  }
});
```

### 4. Controladores de Lectura
**Filtrar por empresa del usuario:**
```javascript
async function obtenerUltimas(req, res) {
  const limite = parseInt(req.query.limite) || 10;
  
  // Si no es superadmin, filtrar por empresa
  const filter = req.user.rol === 'superadmin' 
    ? {} 
    : { empresaId: req.user.empresaId };
  
  const lecturas = await Lectura.find(filter)
    .sort({ timestamp: -1 })
    .limit(limite);
  
  res.json(lecturas);
}
```

## 📱 Configuración ESP32

### Certificado
- CN del certificado = `sensorId` del dispositivo (ej: `esp32-001`)

### Tópicos a publicar
```c
// Obtener empresaId desde configuración del ESP32
char empresa_id[] = "507f1f77bcf86cd799439011";  // ID de la empresa en MongoDB
char sensor_id[] = "esp32-001";                   // sensorId del dispositivo

char telemetry_topic[150];
sprintf(telemetry_topic, "smca/empresa/%s/devices/%s/telemetry/data", empresa_id, sensor_id);

// Publicar
mqtt_client.publish(telemetry_topic, payload);
```

**O más simple:** El backend puede mapear `sensorId` → `empresaId` desde la base de datos.

## 🎛️ ACL Detallado

```acl
#===========================================
# ACL para Dispositivos ESP32
# CN del certificado = sensorId del dispositivo
#===========================================

# Dispositivos publican a su empresa específica
# %u = CN del certificado = sensorId
# Nota: El backend debe validar que sensorId pertenece a esa empresaId
pattern write smca/empresa/+/devices/%u/telemetry/#
pattern write smca/empresa/+/devices/%u/status/#
pattern read  smca/empresa/+/devices/%u/cmd/#

# Opcional: Si el dispositivo tiene datos públicos habilitados
pattern write smca/public/devices/%u/telemetry/#
pattern write smca/public/devices/%u/status/#

#===========================================
# ACL para Backend (acceso completo)
#===========================================
user backend_smca

# Leer datos de todas las empresas
topic read smca/empresa/+/devices/+/telemetry/#
topic read smca/empresa/+/devices/+/status/#

# Publicar comandos a cualquier dispositivo
topic write smca/empresa/+/devices/+/cmd/#

# Leer datos públicos
topic read smca/public/devices/+/telemetry/#
topic read smca/public/devices/+/status/#

# Legacy support
topic read iot/aire/lectura
```

## ✅ Ventajas de esta Estructura

1. **Privacidad:** Cada empresa solo ve sus tópicos
2. **Escalabilidad:** Fácil agregar nuevas empresas
3. **Flexibilidad:** Soporte para datos públicos opcionales
4. **Seguridad:** ACL basado en certificados + validación en backend
5. **Compatibilidad:** Mantener tópico legacy durante migración

## 🚀 Plan de Implementación

1. ✅ Analizar estructura actual
2. ⏳ Actualizar ACL de MQTT
3. ⏳ Modificar cliente MQTT del backend
4. ⏳ Actualizar modelo Lectura (agregar empresaId)
5. ⏳ Actualizar controladores de lectura (filtrar por empresa)
6. ⏳ Actualizar documentación ESP32
7. ⏳ Migrar dispositivos existentes

## 📝 Notas Importantes

- **Seguridad:** El ACL permite que dispositivos publiquen a cualquier empresa, pero el **backend debe validar** que el `sensorId` pertenezca a esa `empresaId`.
- **EmpresaId:** Usar ObjectId de MongoDB (24 caracteres hexadecimales)
- **Migración:** Mantener `iot/aire/lectura` durante la transición
- **Certificados:** El CN del certificado del ESP32 debe ser el `sensorId`
