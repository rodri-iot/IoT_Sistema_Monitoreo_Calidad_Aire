# 📊 Resumen Visual del Flujo del Sistema

## 🔄 Flujo Completo en 4 Pasos

```
┌─────────────────────────────────────────────────────────────────┐
│                   1. REGISTRO DEL DISPOSITIVO                   │
│                    (Una vez, por Admin)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        Admin crea dispositivo en Frontend/API
        {
          sensorId: "esp32-air-001",
          empresa: ObjectId("empresa_air_iot"),  ← Asociado a empresa
          zona: "Planta A",
          ubicacion: { lat, lng }
        }
                              │
                              ▼
        Se guarda en MongoDB:
        Dispositivo {
          sensorId: "esp32-air-001",
          empresa: ObjectId("empresa_air_iot"),  ⭐ CLAVE
          ...
        }


┌─────────────────────────────────────────────────────────────────┐
│             2. ESP32 ENVÍA DATOS POR MQTT                       │
│              (Continuamente, cada X segundos)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ESP32 publica en tópico: "iot/aire/lectura"
        {
          "sensorId": "esp32-air-001",  ⭐ Solo esto identifica
          "pm25": 25.5,
          "pm10": 30.2,
          "co2": 450,
          "temperatura": 22.3,
          "humedad": 65.0
        }
                              │
                              ▼
        Backend recibe mensaje MQTT


┌─────────────────────────────────────────────────────────────────┐
│        3. BACKEND PROCESA Y ASOCIA A EMPRESA                    │
│              (Automático, en mqttClient.js)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        1. Busca dispositivo por sensorId
           Dispositivo.findOne({ sensorId: "esp32-air-001" })
                              │
                              ▼
        2. Si NO existe → ⚠️ IGNORA lectura
           Si existe → Continúa
                              │
                              ▼
        3. Obtiene empresaId del dispositivo
           empresaId = dispositivo.empresa  ⭐ ObjectId("empresa_air_iot")
                              │
                              ▼
        4. Extrae valores ambientales
           valores = Map { pm25: 25.5, pm10: 30.2, ... }
                              │
                              ▼
        5. Guarda lectura en MongoDB
           Lectura {
             sensorId: "esp32-air-001",
             empresaId: ObjectId("empresa_air_iot"),  ⭐ Asociado automáticamente
             dispositivoId: ObjectId("..."),
             valores: Map { pm25: 25.5, ... },
             timestamp: new Date()
           }


┌─────────────────────────────────────────────────────────────────┐
│       4. USUARIO CONSULTA LECTURAS (FILTRADO AUTOMÁTICO)        │
│              (Frontend → Backend → MongoDB)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        Usuario hace: GET /api/lecturas/ultimas
        Headers: { Authorization: "Bearer <token>" }
                              │
                              ▼
        Backend extrae empresaId del token
        token.empresaId = ObjectId("empresa_air_iot")
                              │
                              ▼
        Filtra lecturas por empresaId
        Lectura.find({ empresaId: ObjectId("empresa_air_iot") })
                              │
                              ▼
        Retorna solo lecturas de Air IoT
        [
          { sensorId: "esp32-air-001", valores: {...} },
          { sensorId: "esp32-air-002", valores: {...} }
        ]
                              │
                              ▼
        Frontend muestra en Dashboard
```

---

## 🎯 Puntos Clave

### 1. El ESP32 Solo Conoce su `sensorId`

```
ESP32 sabe:
  ✅ sensorId: "esp32-air-001"
  ✅ Valores que puede medir: pm25, pm10, co2, etc.
  ✅ URL del broker MQTT
  ✅ Certificados TLS

ESP32 NO sabe:
  ❌ A qué empresa pertenece
  ❌ El empresaId
  ❌ Otros dispositivos del sistema
```

### 2. El Backend Resuelve la Empresa Automáticamente

```
Backend recibe: { sensorId: "esp32-air-001", pm25: 25.5, ... }
       │
       ▼
Busca: Dispositivo.findOne({ sensorId: "esp32-air-001" })
       │
       ▼
Obtiene: dispositivo.empresa = ObjectId("empresa_air_iot")
       │
       ▼
Guarda: Lectura { empresaId: ObjectId("empresa_air_iot"), ... }
```

### 3. Los Usuarios Solo Ven Datos de su Empresa

```
Usuario de Air IoT:
  Token: { empresaId: ObjectId("empresa_air_iot") }
  Filtro: { empresaId: ObjectId("empresa_air_iot") }
  Ve: Solo lecturas de Air IoT ✅

Usuario de Otra Empresa:
  Token: { empresaId: ObjectId("otra_empresa") }
  Filtro: { empresaId: ObjectId("otra_empresa") }
  Ve: Solo lecturas de su empresa ✅
  NO ve: Lecturas de Air IoT ❌
```

---

## 📝 Scripts Disponibles

### 1. `setup-and-simulate-air-iot.js` (Recomendado)
**Todo-en-uno**: Crea empresa, dispositivos y simula lecturas

```bash
docker cp backend/scripts/setup-and-simulate-air-iot.js backend:/app/scripts/
docker exec backend node /app/scripts/setup-and-simulate-air-iot.js
```

### 2. `simulate-esp32.js`
**Solo simulación**: Simula un ESP32 específico

```bash
SENSOR_ID=esp32-air-001 node scripts/simulate-esp32.js
```

### 3. `setup-air-iot.js`
**Solo setup**: Crea empresa y dispositivos (sin simular)

```bash
node scripts/setup-air-iot.js
```

---

## ✅ Checklist para Ver Lecturas

- [ ] Empresa "Air IoT" creada
- [ ] Usuario `admin@airiot.com` creado y asociado a Air IoT
- [ ] Dispositivos creados con `sensorId` correcto
- [ ] Lecturas enviadas por MQTT (script de simulación)
- [ ] Backend procesó las lecturas (ver logs)
- [ ] Usuario inició sesión con `admin@airiot.com`
- [ ] Token JWT incluye `empresaId` de Air IoT
- [ ] Frontend hace petición con token
- [ ] Backend filtra por `empresaId`
- [ ] Lecturas aparecen en Dashboard

---

## 🐛 Troubleshooting Rápido

### No veo lecturas en el Dashboard

1. **Verifica que el dispositivo existe**:
   ```bash
   docker exec mongo mongosh smca --eval "db.dispositivos.findOne({sensorId: 'esp32-air-001'})" --quiet
   ```

2. **Verifica que las lecturas se guardaron**:
   ```bash
   docker exec mongo mongosh smca --eval "db.lecturas.find().sort({timestamp: -1}).limit(3).pretty()" --quiet
   ```

3. **Verifica logs del backend**:
   ```bash
   docker logs backend --tail 50 | grep "Lectura guardada"
   ```

4. **Verifica que estás logueado con el usuario correcto**:
   - Email: `admin@airiot.com`
   - Debe estar asociado a la empresa "Air IoT"

5. **Cierra sesión y vuelve a iniciar**:
   - Para refrescar el token con `empresaId` correcto
