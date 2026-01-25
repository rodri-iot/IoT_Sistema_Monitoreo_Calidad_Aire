# 📡 Script de Simulación MQTT - ESP32

## 🎯 Propósito

Este script simula el comportamiento de un ESP32 enviando lecturas ambientales por MQTT usando TLS con certificados, tal como lo haría un dispositivo real.

## 📋 Requisitos Previos

1. **Certificados TLS generados**: Los certificados del cliente deben existir en `mqtt/certs/clients/{device_id}/`
2. **Dispositivo registrado**: El `sensorId` debe existir en la base de datos (colección `dispositivos`)
3. **MQTT Broker corriendo**: Mosquitto debe estar activo y accesible
4. **Backend corriendo**: El backend debe estar escuchando el tópico `iot/aire/lectura`

## 🚀 Uso

### Opción 1: Ejecutar Localmente

```bash
cd backend
node scripts/simulate-mqtt-readings.js
```

### Opción 2: Ejecutar desde Docker

```bash
# Copiar el script al contenedor
docker cp backend/scripts/simulate-mqtt-readings.js backend:/app/scripts/

# Ejecutar
docker exec backend node /app/scripts/simulate-mqtt-readings.js
```

### Opción 3: Con Variables de Entorno

```bash
# Cambiar dispositivo y sensor
DEVICE_ID=nodo02 SENSOR_ID=esp32-002 node scripts/simulate-mqtt-readings.js

# Cambiar número de lecturas
NUM_READINGS=50 node scripts/simulate-mqtt-readings.js
```

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `MQTT_HOST` | URL del broker MQTT | `mqtts://localhost:8883` |
| `MQTT_TOPIC` | Tópico donde publicar | `iot/aire/lectura` |
| `DEVICE_ID` | ID del dispositivo (para certificados) | `nodo01` |
| `SENSOR_ID` | SensorId en la BD | `esp32-001` |
| `NUM_READINGS` | Número de lecturas a enviar | `20` |

### Certificados Disponibles

El script busca certificados en:
- CA: `mqtt/certs/ca/ca.crt`
- Client Cert: `mqtt/certs/clients/{DEVICE_ID}/client.crt`
- Client Key: `mqtt/certs/clients/{DEVICE_ID}/client.key`

**Certificados disponibles:**
- `nodo01` (CN: nodo01)
- `nodo02` (CN: nodo02)
- `nodo03` (CN: nodo03)
- `nodo04` (CN: nodo04)

## 📊 Formato de Datos

El script genera lecturas con el siguiente formato:

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

### Tipos de Dispositivos Simulados

El script alterna entre 3 tipos de dispositivos:

1. **Basic**: `pm25`, `pm10`, `temperatura`, `humedad` (4 parámetros)
2. **Medium**: `pm25`, `pm10`, `co2`, `temperatura`, `humedad` (5 parámetros)
3. **Advanced**: `pm25`, `pm10`, `no2`, `co2`, `co`, `tvoc`, `temperatura`, `humedad` (8 parámetros)

### Rangos de Valores

| Parámetro | Mínimo | Máximo | Unidad |
|-----------|--------|--------|--------|
| PM2.5 | 5 | 100 | µg/m³ |
| PM10 | 10 | 150 | µg/m³ |
| NO₂ | 10 | 200 | ppb |
| CO₂ | 400 | 1200 | ppm |
| CO | 0.5 | 10 | ppm |
| TVOC | 0 | 500 | ppb |
| Temperatura | 18 | 28 | °C |
| Humedad | 30 | 80 | % |

## 🔍 Verificación

### 1. Verificar que el dispositivo existe

```bash
docker exec mongo mongosh smca --eval "db.dispositivos.findOne({sensorId: 'esp32-001'})" --quiet
```

### 2. Verificar lecturas recibidas

```bash
# Ver últimas lecturas en MongoDB
docker exec mongo mongosh smca --eval "db.lecturas.find().sort({timestamp: -1}).limit(5).pretty()" --quiet
```

### 3. Ver logs del backend

```bash
docker logs backend --tail 50
```

Deberías ver mensajes como:
```
📨 Mensaje recibido: {"sensorId":"esp32-001",...}
✅ Lectura guardada: esp32-001 (5 parámetros)
```

## 🐛 Troubleshooting

### Error: "Certificados faltantes"
- **Solución**: Genera los certificados con `cd mqtt && ./generate_certs_v2.sh`

### Error: "Connection refused"
- **Solución**: Verifica que Mosquitto esté corriendo: `docker ps | grep mosquitto`

### Error: "Dispositivo no encontrado"
- **Solución**: Crea el dispositivo en la BD o cambia `SENSOR_ID` a uno existente

### Error: "ECONNREFUSED"
- **Solución**: Si ejecutas desde fuera de Docker, usa `MQTT_HOST=mqtts://localhost:8883` (o la IP de tu máquina)

## 📝 Ejemplo de Uso Completo

```bash
# 1. Asegúrate de que el dispositivo existe
# (Créalo desde el frontend o con un script)

# 2. Ejecuta la simulación
cd backend
node scripts/simulate-mqtt-readings.js

# 3. Verifica en el frontend
# Abre http://localhost:5175 y ve al Dashboard
# Deberías ver las nuevas lecturas aparecer
```

## 🔄 Integración con Script de Simulación de BD

Este script complementa `simulate-data.js`:
- **`simulate-data.js`**: Crea lecturas directamente en MongoDB (para testing rápido)
- **`simulate-mqtt-readings.js`**: Simula el flujo real MQTT → Backend → MongoDB

Usa este último para probar el flujo completo de datos.
