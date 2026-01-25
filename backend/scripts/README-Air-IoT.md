# 🚀 Guía Rápida: Simular Lecturas para Air IoT

## 🎯 Objetivo

Crear la empresa "Air IoT", sus dispositivos, y simular lecturas MQTT para que aparezcan en el Dashboard.

## ⚡ Inicio Rápido (Todo en Uno)

```bash
# Desde el contenedor backend
docker cp backend/scripts/quick-simulate-air-iot.js backend:/app/scripts/
docker exec backend node /app/scripts/quick-simulate-air-iot.js
```

Este script:
1. ✅ Crea la empresa "Air IoT"
2. ✅ Crea usuario admin: `admin@airiot.com` / `admin123`
3. ✅ Crea 3 dispositivos: `esp32-air-001`, `esp32-air-002`, `esp32-air-003`
4. ✅ Simula 20 lecturas por MQTT (60 lecturas totales)

## 📋 Pasos Manuales (Alternativa)

### Paso 1: Configurar Empresa y Dispositivos

```bash
docker cp backend/scripts/setup-air-iot.js backend:/app/scripts/
docker exec backend node /app/scripts/setup-air-iot.js
```

### Paso 2: Simular Lecturas

```bash
# Opción A: Simular para un dispositivo específico
docker cp backend/scripts/simulate-mqtt-readings.js backend:/app/scripts/
docker exec backend SENSOR_ID=esp32-air-001 node /app/scripts/simulate-mqtt-readings.js

# Opción B: Simular para todos los dispositivos
docker exec backend node /app/scripts/simulate-air-iot.js
```

## 🔐 Credenciales de Acceso

Después de ejecutar el script, puedes iniciar sesión con:

- **Email**: `admin@airiot.com`
- **Password**: `admin123`
- **Rol**: `admin`
- **Empresa**: `Air IoT`

## 📊 Dispositivos Creados

| Sensor ID | Nombre | Zona | Parámetros |
|-----------|--------|------|------------|
| `esp32-air-001` | Sensor Principal - Planta A | Planta A | pm25, pm10, co2, temperatura, humedad |
| `esp32-air-002` | Sensor Secundario - Planta B | Planta B | pm25, pm10, no2, co2, co, temperatura, humedad |
| `esp32-air-003` | Sensor Exterior - Patio | Patio Exterior | pm25, pm10, temperatura, humedad |

## 🔍 Verificación

### 1. Verificar Empresa

```bash
docker exec mongo mongosh smca --eval "db.empresas.findOne({nombre: 'Air IoT'})" --quiet
```

### 2. Verificar Dispositivos

```bash
docker exec mongo mongosh smca --eval "db.dispositivos.find({empresa: db.empresas.findOne({nombre: 'Air IoT'})._id}).pretty()" --quiet
```

### 3. Verificar Lecturas

```bash
docker exec mongo mongosh smca --eval "db.lecturas.find().sort({timestamp: -1}).limit(5).pretty()" --quiet
```

### 4. Ver en el Frontend

1. Abre `http://localhost:5175`
2. Inicia sesión con `admin@airiot.com` / `admin123`
3. Ve al Dashboard
4. Deberías ver las lecturas de los dispositivos de Air IoT

## 🐛 Troubleshooting

### No se muestran lecturas en el Dashboard

**Posibles causas:**

1. **Usuario no está asociado a Air IoT**
   - Solución: Inicia sesión con `admin@airiot.com` (no con otro usuario)

2. **Lecturas no tienen empresaId correcto**
   - Verificar: `docker logs backend --tail 50`
   - Deberías ver: `✅ Lectura guardada: esp32-air-001 (X parámetros)`

3. **Token no incluye empresaId**
   - Solución: Cierra sesión y vuelve a iniciar sesión

4. **Filtro en backend está funcionando**
   - El backend filtra por `empresaId` del usuario
   - Si eres superadmin, deberías ver todas las lecturas
   - Si eres admin, solo ves las de tu empresa

### Verificar Token

Abre la consola del navegador y ejecuta:
```javascript
const token = localStorage.getItem('token')
const user = JSON.parse(localStorage.getItem('user'))
console.log('User:', user)
console.log('Token:', token ? 'Presente' : 'Faltante')
```

## 📝 Notas

- Las lecturas se envían al tópico `iot/aire/lectura` (legacy)
- El backend las procesa y guarda en MongoDB
- El frontend las filtra por `empresaId` del usuario
- Si no ves lecturas, verifica que estés logueado con el usuario correcto
