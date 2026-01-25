# 📡 Guía de Simulación MQTT - ESP32

## 🎯 Objetivo

Simular el envío de lecturas ambientales desde un ESP32 por MQTT usando TLS, tal como lo haría un dispositivo real.

## 🚀 Inicio Rápido

### Paso 1: Crear Dispositivo de Prueba (si no existe)

```bash
# Desde el contenedor backend
docker exec backend node /app/scripts/create-test-device.js

# O localmente
cd backend
SENSOR_ID=esp32-001 node scripts/create-test-device.js
```

### Paso 2: Verificar que el Dispositivo Existe

```bash
# Verificar dispositivo
docker exec backend node /app/scripts/check-device.js
```

### Paso 3: Ejecutar Simulación

```bash
# Opción A: Desde el contenedor (recomendado)
docker cp backend/scripts/simulate-mqtt-readings.js backend:/app/scripts/
docker exec backend node /app/scripts/simulate-mqtt-readings.js

# Opción B: Localmente (requiere acceso al broker MQTT)
cd backend
node scripts/simulate-mqtt-readings.js
```

## 📋 Requisitos

1. ✅ **MQTT Broker corriendo**: `docker ps | grep mosquitto`
2. ✅ **Backend corriendo**: `docker ps | grep backend`
3. ✅ **Certificados generados**: En `mqtt/certs/clients/{device_id}/`
4. ✅ **Dispositivo en BD**: Con `sensorId` que coincida con `SENSOR_ID`

## ⚙️ Configuración

### Variables de Entorno

```bash
# Dispositivo y sensor
DEVICE_ID=nodo01          # ID del certificado a usar
SENSOR_ID=esp32-001       # SensorId en la base de datos

# MQTT
MQTT_HOST=mqtts://localhost:8883  # URL del broker
MQTT_TOPIC=iot/aire/lectura        # Tópico donde publicar

# Simulación
NUM_READINGS=20           # Número de lecturas a enviar
INTERVAL_MS=2000          # Intervalo entre lecturas (ms)
```

### Ejemplo Completo

```bash
DEVICE_ID=nodo02 \
SENSOR_ID=esp32-002 \
NUM_READINGS=50 \
INTERVAL_MS=1000 \
node scripts/simulate-mqtt-readings.js
```

## 📊 Formato de Datos Enviados

El script genera mensajes JSON con este formato:

```json
{
  "sensorId": "esp32-001",
  "zona": "Zona A",
  "timestamp": "2026-01-18T23:00:00.000Z",
  "pm25": 25.5,
  "pm10": 30.2,
  "co2": 450,
  "temperatura": 22.3,
  "humedad": 65.0,
  "version": "v2.1.0",
  "calidad": 95
}
```

### Tipos de Dispositivos

El script alterna entre 3 tipos:

1. **Basic** (4 params): `pm25`, `pm10`, `temperatura`, `humedad`
2. **Medium** (5 params): + `co2`
3. **Advanced** (8 params): + `no2`, `co`, `tvoc`

## 🔍 Verificación

### 1. Ver Logs del Backend

```bash
docker logs backend --tail 50 -f
```

Deberías ver:
```
📨 Mensaje recibido: {"sensorId":"esp32-001",...}
✅ Lectura guardada: esp32-001 (5 parámetros)
```

### 2. Ver Lecturas en MongoDB

```bash
docker exec mongo mongosh smca --eval "db.lecturas.find().sort({timestamp: -1}).limit(5).pretty()" --quiet
```

### 3. Ver en el Frontend

Abre `http://localhost:5175` y ve al Dashboard. Las lecturas deberían aparecer automáticamente.

## 🐛 Troubleshooting

### Error: "Certificados faltantes"

```bash
# Generar certificados
cd mqtt
./generate_certs_v2.sh
```

### Error: "Dispositivo no encontrado"

```bash
# Crear dispositivo
docker exec backend node /app/scripts/create-test-device.js
```

### Error: "Connection refused"

```bash
# Verificar que Mosquitto esté corriendo
docker ps | grep mosquitto

# Ver logs de Mosquitto
docker logs mosquitto --tail 20
```

### Error: "ECONNREFUSED" (desde fuera de Docker)

Si ejecutas el script desde tu máquina (no desde Docker), ajusta `MQTT_HOST`:

```bash
# Para Docker en localhost
MQTT_HOST=mqtts://localhost:8883 node scripts/simulate-mqtt-readings.js

# Para Docker en otra máquina
MQTT_HOST=mqtts://192.168.1.6:8883 node scripts/simulate-mqtt-readings.js
```

## 📝 Ejemplo de Flujo Completo

```bash
# 1. Crear dispositivo de prueba
docker exec backend node /app/scripts/create-test-device.js

# 2. Verificar
docker exec backend node /app/scripts/check-device.js

# 3. Copiar script al contenedor
docker cp backend/scripts/simulate-mqtt-readings.js backend:/app/scripts/

# 4. Ejecutar simulación
docker exec backend node /app/scripts/simulate-mqtt-readings.js

# 5. Verificar en frontend
# Abre http://localhost:5175 y ve al Dashboard
```

## 🔄 Integración con Otros Scripts

- **`create-admin.js`**: Crea usuario administrador
- **`create-test-device.js`**: Crea dispositivo de prueba
- **`check-device.js`**: Verifica que dispositivo existe
- **`simulate-data.js`**: Crea lecturas directamente en MongoDB (sin MQTT)
- **`simulate-mqtt-readings.js`**: Simula flujo completo MQTT → Backend → MongoDB

## 💡 Tips

1. **Múltiples dispositivos**: Ejecuta el script varias veces con diferentes `DEVICE_ID` y `SENSOR_ID`
2. **Intervalo rápido**: Usa `INTERVAL_MS=500` para pruebas rápidas
3. **Muchas lecturas**: Usa `NUM_READINGS=100` para generar más datos
4. **Monitoreo en tiempo real**: Abre el Dashboard del frontend mientras ejecutas el script

## 📚 Archivos Relacionados

- `backend/scripts/simulate-mqtt-readings.js` - Script principal
- `backend/scripts/create-test-device.js` - Crear dispositivo
- `backend/scripts/check-device.js` - Verificar dispositivo
- `backend/scripts/README-simulacion.md` - Documentación detallada
