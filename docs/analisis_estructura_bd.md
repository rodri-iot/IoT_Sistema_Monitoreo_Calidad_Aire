# 📊 Análisis y Propuesta de Estructura de Base de Datos

## 🔍 Análisis de la Estructura Actual

### Modelos Existentes

#### 1. **Empresa**
```javascript
{
  _id: ObjectId,
  nombre: String,
  usuarios: [ObjectId] // Referencias a Usuario
}
```

#### 2. **Usuario**
```javascript
{
  _id: ObjectId,
  correo: String (único),
  password: String (hasheado),
  rol: 'admin' | 'supervisor' | 'superadmin',
  empresa: ObjectId // Referencia a Empresa
}
```

#### 3. **Dispositivo** (Actual)
```javascript
{
  _id: ObjectId,
  sensorId: String (único),
  nombre: String,
  zona: String,
  empresa: ObjectId, // Referencia a Empresa
  nombreEmpresa: String, // ⚠️ Redundante
  descripcion: String,
  estado: 'activo' | 'inactivo' | 'desconocido',
  fechaRegistro: Date
}
```

**Problemas identificados:**
- ❌ No tiene `ubicacion: { lat, lng }` (requerido)
- ❌ `nombreEmpresa` es redundante (se puede obtener vía `empresa`)

#### 4. **Lectura** (Actual)
```javascript
{
  _id: ObjectId,
  sensorId: String,
  zona: String,
  timestamp: Date,
  pm25: Number,
  pm10: Number,
  no2: Number,
  co2: Number,
  co: Number,
  tvoc: Number,
  temperatura: Number,
  humedad: Number
  // presion: Number (comentado)
}
```

**Problemas críticos:**
- ❌ **Schema fijo**: No permite flexibilidad (2-8+ parámetros variables)
- ❌ **No tiene `empresaId`**: Requiere join con Dispositivo para filtrar
- ❌ **Campos opcionales como null**: Ocupa espacio innecesario
- ❌ **No escalable**: Agregar nuevos sensores requiere modificar schema

### Flujo de Datos Actual

```
MQTT → mqttClient.js → Lectura.save() → MongoDB
```

**Problemas:**
- No valida que el `sensorId` exista en Dispositivo
- No extrae `empresaId` automáticamente
- No filtra por empresa en las consultas

---

## 🎯 Propuesta: Esquema Optimizado

### Opción 1: **Bucket Pattern + Atributos Dinámicos** (Recomendado)

Ideal para IoT con alta frecuencia de lecturas y parámetros variables.

#### **Dispositivo** (Mejorado)
```javascript
{
  _id: ObjectId,
  sensorId: String (único, indexado),
  nombre: String,
  zona: String,
  empresa: ObjectId, // Referencia a Empresa (indexado)
  ubicacion: {
    lat: Number,
    lng: Number
  },
  descripcion: String,
  estado: 'activo' | 'inactivo' | 'desconocido',
  fechaRegistro: Date,
  ultimaLectura: Date, // Para tracking rápido
  parametrosSoportados: [String] // Ej: ['pm25', 'pm10', 'co2', 'temperatura']
}
```

#### **Lectura** (Bucket Pattern + Atributos Dinámicos)
```javascript
{
  _id: ObjectId,
  sensorId: String (indexado),
  empresaId: ObjectId (indexado), // ⭐ Agregado para queries rápidas
  dispositivoId: ObjectId, // Referencia a Dispositivo (opcional, para joins)
  timestamp: Date (indexado),
  zona: String, // Denormalizado para queries rápidas
  
  // ⭐ Atributos dinámicos usando Map
  valores: {
    type: Map,
    of: Number
  },
  // Ejemplo: valores = { pm25: 25.5, pm10: 30.2, co2: 450, temperatura: 22.3 }
  
  // Metadatos
  version: String, // Versión del firmware/sensor
  calidad: Number, // 0-100, calidad de la lectura
  metadata: {
    tipo: String, // 'telemetria', 'status', 'evento'
    fuente: String // 'mqtt', 'api', 'sync'
  }
}
```

**Ventajas:**
- ✅ **Flexible**: Soporta 2-8+ parámetros sin modificar schema
- ✅ **Eficiente**: Solo almacena valores presentes (no nulls)
- ✅ **Escalable**: Fácil agregar nuevos tipos de sensores
- ✅ **Queries rápidas**: `empresaId` indexado permite filtrado directo

**Ejemplo de documento:**
```javascript
{
  _id: ObjectId("..."),
  sensorId: "esp32-001",
  empresaId: ObjectId("..."),
  timestamp: ISODate("2026-01-18T23:00:00Z"),
  zona: "Zona A",
  valores: {
    pm25: 25.5,
    pm10: 30.2,
    temperatura: 22.3
  },
  calidad: 95
}
```

#### **Índices Recomendados**
```javascript
// Lectura
db.lecturas.createIndex({ sensorId: 1, timestamp: -1 })
db.lecturas.createIndex({ empresaId: 1, timestamp: -1 })
db.lecturas.createIndex({ timestamp: -1 })
db.lecturas.createIndex({ "valores.pm25": 1 }) // Para queries específicas

// Dispositivo
db.dispositivos.createIndex({ sensorId: 1 })
db.dispositivos.createIndex({ empresa: 1 })
```

---

### Opción 2: **Star Schema (Data Warehouse)** 

Ideal si necesitas análisis complejos, reportes, y agregaciones pesadas.

#### **Tabla de Hechos: LecturaFact**
```javascript
{
  _id: ObjectId,
  // Dimensiones (Foreign Keys)
  dispositivoId: ObjectId,
  empresaId: ObjectId,
  tiempoId: ObjectId, // Referencia a DimensiónTiempo
  
  // Medidas
  pm25: Number,
  pm10: Number,
  co2: Number,
  // ... otros parámetros
  
  // Metadatos
  timestamp: Date,
  calidad: Number
}
```

#### **Dimensiones**
```javascript
// DimensiónTiempo (para análisis temporal)
{
  _id: ObjectId,
  fecha: Date,
  año: Number,
  mes: Number,
  dia: Number,
  hora: Number,
  diaSemana: String
}

// DimensiónDispositivo (snapshot del dispositivo)
{
  _id: ObjectId,
  sensorId: String,
  nombre: String,
  zona: String,
  empresaId: ObjectId,
  ubicacion: { lat, lng }
}
```

**Ventajas:**
- ✅ Optimizado para análisis y reportes
- ✅ Queries de agregación muy rápidas
- ✅ Separación clara entre hechos y dimensiones

**Desventajas:**
- ❌ Más complejo de mantener
- ❌ Requiere ETL para poblar dimensiones
- ❌ Overhead para aplicaciones simples

**Recomendación:** Usar solo si necesitas análisis complejos (dashboards avanzados, ML, etc.)

---

## 🏆 Recomendación Final: **Opción 1 (Bucket Pattern + Atributos Dinámicos)**

### Razones:
1. **Flexibilidad**: Soporta 2-8+ parámetros sin cambios de schema
2. **Simplicidad**: Mantenimiento más fácil que Star Schema
3. **Performance**: Suficiente para la mayoría de casos de uso IoT
4. **Escalabilidad**: Fácil agregar nuevos tipos de sensores

### Estructura Final Propuesta

```javascript
// ============================================
// DISPOSITIVO
// ============================================
const dispositivoSchema = new mongoose.Schema({
  sensorId: { type: String, required: true, unique: true, index: true },
  nombre: { type: String, required: true },
  zona: { type: String, required: true },
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  ubicacion: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  descripcion: String,
  estado: { 
    type: String, 
    enum: ['activo', 'inactivo', 'desconocido'], 
    default: 'desconocido' 
  },
  fechaRegistro: { type: Date, default: Date.now },
  ultimaLectura: Date,
  parametrosSoportados: [String] // Ej: ['pm25', 'pm10', 'co2']
}, { collection: 'dispositivos' })

// ============================================
// LECTURA (Bucket Pattern + Atributos Dinámicos)
// ============================================
const lecturaSchema = new mongoose.Schema({
  sensorId: { type: String, required: true, index: true },
  empresaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true, index: true },
  dispositivoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispositivo' },
  timestamp: { type: Date, default: Date.now, required: true, index: true },
  zona: { type: String, required: true },
  
  // ⭐ Atributos dinámicos
  valores: {
    type: Map,
    of: Number,
    required: true
  },
  
  // Metadatos opcionales
  version: String,
  calidad: { type: Number, min: 0, max: 100 },
  metadata: {
    tipo: { type: String, enum: ['telemetria', 'status', 'evento'], default: 'telemetria' },
    fuente: { type: String, enum: ['mqtt', 'api', 'sync'], default: 'mqtt' }
  }
}, { 
  collection: 'lecturas',
  timestamps: false // Usamos timestamp manual
})

// Índices compuestos
lecturaSchema.index({ sensorId: 1, timestamp: -1 })
lecturaSchema.index({ empresaId: 1, timestamp: -1 })
lecturaSchema.index({ timestamp: -1 })
```

---

## 🔄 Cambios Necesarios en el Código

### 1. **Actualizar Modelo Dispositivo**
- Agregar `ubicacion: { lat, lng }`
- Agregar `parametrosSoportados: [String]`
- Eliminar `nombreEmpresa` (redundante)

### 2. **Actualizar Modelo Lectura**
- Cambiar de campos fijos a `valores: Map<String, Number>`
- Agregar `empresaId` (obtenido desde Dispositivo)
- Agregar `dispositivoId` (referencia)
- Agregar metadatos opcionales

### 3. **Actualizar mqttClient.js**
- Validar que `sensorId` exista en Dispositivo
- Obtener `empresaId` desde Dispositivo
- Convertir payload JSON a `valores: Map`
- Guardar con `empresaId` y `dispositivoId`

### 4. **Actualizar lectura.controller.js**
- Filtrar por `empresaId` según el usuario
- Agregar queries para parámetros específicos
- Agregar agregaciones si es necesario

---

## 📈 Consideraciones de Performance

### Queries Comunes

#### 1. **Últimas lecturas por empresa**
```javascript
Lectura.find({ empresaId: empresaId })
  .sort({ timestamp: -1 })
  .limit(10)
```

#### 2. **Lecturas de un sensor específico**
```javascript
Lectura.find({ sensorId: 'esp32-001' })
  .sort({ timestamp: -1 })
```

#### 3. **Lecturas con parámetro específico**
```javascript
Lectura.find({ 
  empresaId: empresaId,
  'valores.pm25': { $exists: true }
})
```

#### 4. **Agregaciones (promedio por hora)**
```javascript
Lectura.aggregate([
  { $match: { empresaId: empresaId, timestamp: { $gte: fechaInicio } } },
  { $group: {
      _id: { 
        $dateToString: { format: "%Y-%m-%d %H:00:00", date: "$timestamp" }
      },
      promedioPM25: { $avg: "$valores.pm25" },
      promedioPM10: { $avg: "$valores.pm10" }
    }
  }
])
```

---

## 🚀 Plan de Implementación

1. ✅ Analizar estructura actual
2. ⏳ Crear nuevos schemas (Dispositivo + Lectura)
3. ⏳ Actualizar mqttClient.js para usar nuevo schema
4. ⏳ Actualizar lectura.controller.js con filtrado por empresa
5. ⏳ Migrar datos existentes (si hay)
6. ⏳ Actualizar frontend para manejar atributos dinámicos
7. ⏳ Crear script de simulación de datos

---

## 📝 Notas Adicionales

### ¿Cuándo usar Star Schema?
- Si necesitas análisis complejos (dashboards avanzados, ML)
- Si tienes millones de lecturas y necesitas agregaciones pesadas
- Si planeas hacer data mining o business intelligence

### ¿Cuándo usar Bucket Pattern?
- Si tienes alta frecuencia de lecturas (cada segundo/minuto)
- Si los parámetros varían por dispositivo
- Si necesitas flexibilidad sin modificar schema
- **Recomendado para tu caso de uso**

### TTL (Time To Live)
Considera agregar TTL a lecturas antiguas si no necesitas histórico completo:
```javascript
lecturaSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 }) // 1 año
```
