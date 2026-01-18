# 📡 Estructura de Tópicos MQTT por Usuario/Empresa

## 🎯 Objetivo

Organizar los tópicos MQTT por usuario para:
- ✅ **Privacidad**: cada usuario solo ve sus datos privados
- ✅ **Escalabilidad**: soporte para múltiples usuarios/empresas
- ✅ **Publicación opcional**: permitir hacer datos públicos sin cambiar el ACL

## 🔐 Autenticación y Autorización

### Sistema de Certificados TLS
- **`require_certificate true`**: Los certificados TLS son obligatorios para conectarse
- **`use_identity_as_username true`**: Mosquitto usa el **CN (Common Name)** del certificado como `username` para autorización
- **`allow_anonymous false`**: Solo usuarios autenticados pueden conectarse
- **`password_file`**: Debe contener el usuario (aunque el password no se valida con certificados TLS)

### Identificación de Usuarios
El **CN del certificado** del cliente (ESP32 o App) se usa como identificador único:
- `%u` en el ACL = CN del certificado del cliente que se conecta
- Ejemplo: Si el CN es `usuario1`, entonces `%u` = `usuario1`

## 📊 Estructura Actual de Tópicos

### Estructura Implementada (ACL Actual)
```
# Tópicos privados (solo visibles para el usuario propietario)
smca/{usuario}/private/{dispositivo}/telemetry/#
smca/{usuario}/private/{dispositivo}/status/#
smca/{usuario}/private/{dispositivo}/cmd/#

# Tópicos públicos (visibles para todos los usuarios autenticados)
smca/{usuario}/public/{dispositivo}/telemetry/#
smca/{usuario}/public/{dispositivo}/status/#

# Otros tópicos en la jerarquía del usuario
smca/{usuario}/{dispositivo}/status/#
smca/{usuario}/{dispositivo}/cmd/#
```

**Ejemplos:**
```
smca/usuario1/private/nodo01/telemetry/data
smca/usuario1/private/nodo01/status/online
smca/usuario1/private/nodo01/cmd/calibrate

smca/usuario1/public/nodo02/telemetry/data  # Visible para todos
smca/usuario1/public/nodo02/status/online

smca/usuario2/private/nodo03/telemetry/data  # Solo visible para usuario2
```

### Tópico Legacy (compatibilidad)
```
iot/aire/lectura  # Mantener durante migración
```

## 🔐 ACL Implementado

### Reglas para Dispositivos ESP32 y Usuarios
```acl
# 1. Cada cliente puede leer/escribir en su propia jerarquía completa
# %u se reemplaza por el CN del certificado (username del ESP32/usuario)
pattern readwrite smca/%u/#

# 2. Permitir que CUALQUIER usuario autenticado lea lo que sea "public" de otros
# El '+' es un comodín para cualquier userID
topic read smca/+/public/#
```

**Explicación:**
- **`pattern readwrite smca/%u/#`**: 
  - Si el CN del certificado es `usuario1`, puede leer/escribir en `smca/usuario1/#`
  - Permite acceso completo a su propia jerarquía (private, public, y otros subdirectorios)
  - Un dispositivo con CN `nodo01` puede publicar/leer en `smca/nodo01/#`

- **`topic read smca/+/public/#`**: 
  - Cualquier usuario autenticado puede leer tópicos públicos de otros usuarios
  - `+` es un wildcard que coincide con cualquier nivel
  - Ejemplo: `usuario1` puede leer `smca/usuario2/public/nodo01/telemetry/data`

### Reglas para el Backend
```acl
user backend_smca

# El backend tiene acceso completo a toda la jerarquía smca/
topic readwrite smca/#

# Y también al tópico legacy iot/aire/lectura (para compatibilidad)
topic readwrite iot/aire/#
```

**Explicación:**
- El backend usa un certificado con CN = `backend_smca`
- Tiene acceso completo a todos los tópicos `smca/#` para leer datos de todos los usuarios
- Puede publicar comandos a cualquier dispositivo en `smca/{usuario}/.../cmd/#`

## 🏗️ Modelo de Datos

### Modelos de MongoDB
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
  - sensorId (único)        # Este es el CN del certificado del ESP32
  - nombre
  - zona
  - empresa: ObjectId → Empresa
  - nombreEmpresa
  - estado: activo | inactivo | desconocido

Lectura
  - sensorId                # Relacionado con Dispositivo
  - zona
  - timestamp
  - datos ambientales (pm25, pm10, co2, etc.)
  ⚠️ NO tiene relación directa con Empresa (se obtiene vía Dispositivo)
```

### Mapeo CN del Certificado → Usuario/Empresa

**Opción 1: CN = sensorId (Recomendado para ESP32)**
- El CN del certificado del ESP32 es el `sensorId` del dispositivo
- El backend busca el `Dispositivo` por `sensorId` para obtener `empresa`
- Ejemplo: CN `esp32-001` → `Dispositivo.sensorId = "esp32-001"` → `empresa = ObjectId(...)`

**Opción 2: CN = Usuario/Identificador de Empresa**
- El CN del certificado es un identificador del usuario o empresa
- El backend mapea el CN a la empresa correspondiente
- Ejemplo: CN `usuario1` → `Usuario.correo = "usuario1@empresa.com"` → `empresa = ObjectId(...)`

## 🔄 Gestión de Privacidad (Private vs Public)

### Comportamiento por Defecto (Privado)
Cuando un ESP32 publica en tópicos `private/`:
```c
// ESP32 publica en tópico privado
char topic[] = "smca/usuario1/private/nodo01/telemetry/data";
mqtt_client.publish(topic, payload);
```
- Solo el usuario con CN `usuario1` puede leer estos datos (gracias a `pattern readwrite smca/%u/#`)
- El backend puede leer estos datos (gracias a `topic readwrite smca/#`)

### Cambio a Público (Sin Modificar ACL)
Para hacer datos públicos, el ESP32 simplemente cambia el tópico a `public/`:
```c
// ESP32 publica en tópico público
char topic[] = "smca/usuario1/public/nodo01/telemetry/data";
mqtt_client.publish(topic, payload);
```
- El usuario `usuario1` puede leer/escribir (por `pattern readwrite smca/%u/#`)
- **Todos los demás usuarios** pueden leer estos datos (gracias a `topic read smca/+/public/#`)
- El backend puede leer estos datos (gracias a `topic readwrite smca/#`)

**Ventaja**: No es necesario modificar el ACL ni reiniciar Mosquitto. Solo cambiar el tópico que publica el ESP32.

## 🔄 Cambios Necesarios en el Backend

### 1. Cliente MQTT del Backend
**Actualizar suscripciones para usar la nueva estructura:**

```javascript
// Suscribirse a todos los tópicos de usuarios (private y public)
client.subscribe('smca/+/private/+/telemetry/#', ...)
client.subscribe('smca/+/public/+/telemetry/#', ...)
// O simplemente suscribirse a todo smca/# (el backend tiene permisos completos)
client.subscribe('smca/#', ...)
client.subscribe('iot/aire/lectura', ...) // Legacy
```

**Procesar mensajes y extraer usuario:**

```javascript
client.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    
    // Extraer usuario y tipo (private/public) del tópico
    // Ejemplo: smca/usuario1/private/nodo01/telemetry/data
    const match = topic.match(/smca\/([^\/]+)\/(private|public)\/([^\/]+)\/telemetry\//);
    
    if (match) {
      const [, usuario, tipo, sensorId] = match;
      const esPublico = tipo === 'public';
      
      // Buscar dispositivo por sensorId para obtener empresaId
      const dispositivo = await Dispositivo.findOne({ sensorId });
      
      if (!dispositivo) {
        logger(`⚠️ Dispositivo ${sensorId} no encontrado`);
        return;
      }
      
      // Guardar lectura con información del dispositivo
      const lectura = new Lectura({
        ...data,
        sensorId,
        zona: dispositivo.zona,
        // Si el modelo Lectura tiene empresaId, se puede agregar aquí
        // empresaId: dispositivo.empresa
      });
      
      await lectura.save();
      logger(`✅ Lectura guardada: ${sensorId} (${tipo})`);
    }
    // También manejar tópico legacy iot/aire/lectura
  } catch (err) {
    logger('❌ Error al procesar mensaje MQTT:', err);
  }
});
```

### 2. Modelo Lectura (Opcional)
**Si se quiere agregar `empresaId` directamente:**

```javascript
const lecturaSchema = new mongoose.Schema({
  sensorId: { type: String, required: true },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa' }, // NUEVO
  zona: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  // ... resto de campos ambientales
})
```

**O alternativamente:** Obtener `empresaId` desde `Dispositivo` usando `sensorId` cuando sea necesario (joins en consultas).

### 3. Controladores de Lectura
**Filtrar por empresa del usuario autenticado:**

```javascript
async function obtenerUltimas(req, res) {
  const limite = parseInt(req.query.limite) || 10;
  
  // Si no es superadmin, filtrar por empresa del usuario
  let filter = {};
  
  if (req.user.rol !== 'superadmin') {
    // Obtener empresaId del usuario
    const usuario = await Usuario.findById(req.user._id).populate('empresa');
    if (usuario && usuario.empresa) {
      // Buscar dispositivos de esa empresa y filtrar por sensorId
      const dispositivos = await Dispositivo.find({ empresa: usuario.empresa._id });
      const sensorIds = dispositivos.map(d => d.sensorId);
      filter = { sensorId: { $in: sensorIds } };
    }
  }
  
  const lecturas = await Lectura.find(filter)
    .sort({ timestamp: -1 })
    .limit(limite);
  
  res.json(lecturas);
}
```

## 📱 Configuración ESP32

### Certificado
- **CN del certificado = `sensorId` del dispositivo** (ej: `esp32-001`, `nodo01`)
- El `sensorId` debe coincidir con el campo `sensorId` en la colección `Dispositivo` de MongoDB

### Tópicos a Publicar

#### Ejemplo en C++ (Arduino/ESP32):
```cpp
// Configuración
const char* usuario_id = "usuario1";        // Identificador del usuario/empresa
const char* sensor_id = "esp32-001";        // sensorId (debe coincidir con CN del certificado)

// Tópico privado (solo visible para el usuario)
char telemetry_topic_private[200];
sprintf(telemetry_topic_private, "smca/%s/private/%s/telemetry/data", usuario_id, sensor_id);

// Tópico público (visible para todos)
char telemetry_topic_public[200];
sprintf(telemetry_topic_public, "smca/%s/public/%s/telemetry/data", usuario_id, sensor_id);

// Publicar telemetría
String payload = "{\"pm25\":25.5,\"pm10\":30.2,\"co2\":450}";
mqtt_client.publish(telemetry_topic_private, payload.c_str());
```

#### Ejemplo con Status:
```cpp
// Status del dispositivo
char status_topic[200];
sprintf(status_topic, "smca/%s/%s/status/online", usuario_id, sensor_id);
mqtt_client.publish(status_topic, "1");
```

#### Suscribirse a Comandos:
```cpp
// Suscribirse a comandos para este sensor
char cmd_topic[200];
sprintf(cmd_topic, "smca/%s/%s/cmd/#", usuario_id, sensor_id);
mqtt_client.subscribe(cmd_topic);
```

## ✅ Ventajas de esta Estructura

1. **Privacidad por defecto**: Los datos están en `private/` y solo el propietario los ve
2. **Publicación flexible**: Cambiar a `public/` sin modificar ACL ni reiniciar Mosquitto
3. **Simplicidad**: Estructura plana con `smca/%u/#` es fácil de entender y mantener
4. **Escalabilidad**: Fácil agregar nuevos usuarios (solo generar certificado con nuevo CN)
5. **Seguridad**: ACL basado en certificados TLS + validación en backend
6. **Compatibilidad**: Mantener tópico legacy durante migración

## 🚀 Plan de Implementación

1. ✅ Analizar estructura actual
2. ✅ Actualizar ACL de MQTT (estructura `smca/%u/#` implementada)
3. ⏳ Modificar cliente MQTT del backend (suscripción a `smca/#` y procesamiento)
4. ⏳ Actualizar modelo Lectura (opcional: agregar `empresaId`)
5. ⏳ Actualizar controladores de lectura (filtrar por empresa del usuario)
6. ⏳ Actualizar documentación ESP32 con nueva estructura
7. ⏳ Migrar dispositivos existentes

## 📝 Notas Importantes

### Seguridad
- **ACL permite flexibilidad**: Con `pattern readwrite smca/%u/#`, cada dispositivo puede publicar en toda su jerarquía. El backend debe validar que el `sensorId` (CN) corresponda a la empresa correcta.

### Identificadores
- **CN del certificado**: Usa `sensorId` del dispositivo para ESP32, o un identificador de usuario para aplicaciones
- **Usuario en tópico**: El identificador en `smca/{usuario}/...` puede ser:
  - El mismo `sensorId` (si cada dispositivo es su propio "usuario")
  - Un identificador de empresa/usuario (múltiples dispositivos comparten el mismo usuario)

### Migración
- **Tópico legacy**: Mantener `iot/aire/lectura` durante la transición para compatibilidad
- **Migración gradual**: Los dispositivos pueden migrar uno por uno a la nueva estructura sin afectar a los demás

### ACL vs Validación Backend
- **ACL (Mosquitto)**: Controla qué usuarios pueden publicar/leer en qué tópicos
- **Backend (Validación)**: Debe validar que los datos sean consistentes (ej: sensorId pertenece a la empresa correcta)
