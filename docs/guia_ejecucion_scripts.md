# 🚀 Guía: Ejecutar Scripts de Simulación MQTT

## 🎯 Recomendación para Esta Etapa

### ✅ **Ejecutar DENTRO de Docker** (Recomendado para Testing Inicial)

**Ventajas:**
- ✅ **Todo configurado**: Certificados, red, variables de entorno
- ✅ **Más simple**: No necesitas configurar rutas ni conexiones
- ✅ **Rápido para verificar**: Solo copiar y ejecutar
- ✅ **Mismo entorno que producción**: Pruebas más realistas

**Desventajas:**
- ⚠️ Necesitas copiar scripts al contenedor
- ⚠️ Logs menos accesibles (aunque puedes usar `docker logs`)

### 🔧 **Ejecutar FUERA de Docker** (Recomendado para Debugging Avanzado)

**Ventajas:**
- ✅ **Debugging más fácil**: Puedes usar `console.log`, debugger, etc.
- ✅ **Iteración rápida**: No necesitas copiar archivos
- ✅ **Acceso directo a archivos**: Puedes modificar y ejecutar inmediatamente

**Desventajas:**
- ⚠️ Necesitas configurar rutas de certificados
- ⚠️ Necesitas usar `localhost:8883` en lugar de `mosquitto:8883`
- ⚠️ Variables de entorno pueden no estar disponibles

---

## 📋 Opción 1: Dentro de Docker (Recomendado)

### Setup Inicial (Una vez)

```bash
# 1. Copiar scripts al contenedor
docker cp backend/scripts/setup-and-simulate-air-iot.js backend:/app/scripts/
docker cp backend/scripts/simulate-esp32.js backend:/app/scripts/

# 2. Verificar que están copiados
docker exec backend ls -la /app/scripts/
```

### Ejecutar Simulación

```bash
# Opción A: Todo-en-uno (Setup + Simulación)
docker exec backend node /app/scripts/setup-and-simulate-air-iot.js

# Opción B: Solo simular (si ya tienes dispositivos)
docker exec backend SENSOR_ID=esp32-air-001 node /app/scripts/simulate-esp32.js
```

### Ver Logs

```bash
# Logs del backend (para ver procesamiento de lecturas)
docker logs backend --tail 50 -f

# Logs de Mosquitto (para ver conexiones MQTT)
docker logs mosquitto --tail 50 -f
```

### Verificar en Base de Datos

```bash
# Ver lecturas guardadas
docker exec mongo mongosh smca --eval "db.lecturas.find().sort({timestamp: -1}).limit(5).pretty()" --quiet

# Ver dispositivos
docker exec mongo mongosh smca --eval "db.dispositivos.find().pretty()" --quiet
```

---

## 📋 Opción 2: Fuera de Docker

### Requisitos

1. **Node.js instalado localmente** (versión 18+)
2. **Dependencias instaladas**:
   ```bash
   cd backend
   npm install
   ```
3. **Certificados accesibles**: Ya están en `mqtt/certs/`
4. **MQTT Broker accesible**: Puerto 8883 expuesto en `localhost:8883`

### Configuración

**Crear archivo `.env.local` en `backend/`**:
```bash
# MongoDB (desde fuera de Docker)
MONGODB_URI=mongodb://localhost:27017/smca

# MQTT (desde fuera de Docker, usar localhost)
MQTT_HOST=mqtts://localhost:8883
MQTT_TOPIC=iot/aire/lectura

# JWT Secret (si lo necesitas)
JWT_SECRET=tu_secret_aqui
```

### Ejecutar Scripts

```bash
cd backend

# Opción A: Todo-en-uno
node scripts/setup-and-simulate-air-iot.js

# Opción B: Solo simular
SENSOR_ID=esp32-air-001 node scripts/simulate-esp32.js
```

### Verificar Conexión MQTT

```bash
# Verificar que Mosquitto está accesible
openssl s_client -connect localhost:8883 -CAfile mqtt/certs/ca/ca.crt

# O usar un cliente MQTT de prueba
mosquitto_pub -h localhost -p 8883 \
  --cafile mqtt/certs/ca/ca.crt \
  --cert mqtt/certs/clients/nodo01/client.crt \
  --key mqtt/certs/clients/nodo01/client.key \
  -t "iot/aire/lectura" \
  -m '{"sensorId":"test","pm25":25.5}'
```

---

## 🔍 Comparación Rápida

| Aspecto | Dentro de Docker | Fuera de Docker |
|---------|------------------|-----------------|
| **Configuración** | ✅ Ya está todo | ⚠️ Necesitas configurar |
| **Certificados** | ✅ Accesibles | ✅ Accesibles |
| **MQTT Host** | `mosquitto:8883` | `localhost:8883` |
| **MongoDB** | `mongo:27017` | `localhost:27017` |
| **Debugging** | ⚠️ Menos fácil | ✅ Más fácil |
| **Iteración** | ⚠️ Copiar archivos | ✅ Directo |
| **Recomendado para** | Testing inicial | Debugging avanzado |

---

## 💡 Recomendación Final

### Para Esta Etapa (Testing Inicial):

**✅ Usa DENTRO de Docker** porque:

1. **Ya está todo configurado**: No necesitas cambiar nada
2. **Más rápido**: Solo copiar y ejecutar
3. **Más realista**: Simula el entorno de producción
4. **Fácil verificación**: Puedes ver logs y BD directamente

### Para Debugging Avanzado:

**✅ Usa FUERA de Docker** cuando:

1. Necesites hacer debugging paso a paso
2. Quieras modificar el script frecuentemente
3. Necesites usar herramientas de desarrollo (debugger, etc.)

---

## 🚀 Scripts Mejorados (Funcionan en Ambos Entornos)

He actualizado los scripts para que funcionen automáticamente en ambos entornos:

- **Detectan si están en Docker o fuera**
- **Ajustan rutas de certificados automáticamente**
- **Usan el host correcto** (`mosquitto:8883` vs `localhost:8883`)

### Ejemplo de Uso (Dentro de Docker):

```bash
# Copiar script
docker cp backend/scripts/setup-and-simulate-air-iot.js backend:/app/scripts/

# Ejecutar
docker exec backend node /app/scripts/setup-and-simulate-air-iot.js
```

### Ejemplo de Uso (Fuera de Docker):

```bash
cd backend

# Configurar .env.local si es necesario
# (Los scripts detectan automáticamente el entorno)

# Ejecutar
node scripts/setup-and-simulate-air-iot.js
```

---

## 🐛 Troubleshooting

### Error: "Cannot connect to MQTT"

**Dentro de Docker:**
- Verifica que Mosquitto esté corriendo: `docker ps | grep mosquitto`
- Verifica logs: `docker logs mosquitto --tail 20`

**Fuera de Docker:**
- Verifica que el puerto 8883 esté expuesto: `netstat -an | grep 8883`
- Verifica que puedas conectarte: `telnet localhost 8883`
- Usa `mqtts://localhost:8883` (no `mqtts://mosquitto:8883`)

### Error: "Certificados no encontrados"

**Dentro de Docker:**
- Verifica que los certificados estén en `mqtt/certs/`
- Verifica que el volumen esté montado: `docker inspect mosquitto | grep certs`

**Fuera de Docker:**
- Verifica que los certificados estén en `mqtt/certs/` (relativo a la raíz del proyecto)
- El script busca automáticamente en varias ubicaciones

### Error: "Dispositivo no encontrado"

- Ejecuta primero el script de setup: `setup-and-simulate-air-iot.js`
- O crea el dispositivo manualmente desde el frontend
