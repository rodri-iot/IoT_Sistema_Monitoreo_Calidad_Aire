# 📋 Resumen de Cambios: Frontend y Permisos

## ✅ Cambios Realizados

### 1. Vista de Dispositivos (`frontend/src/views/Dispositivos.jsx`)
- ✅ **Implementada completamente**: Ahora muestra todos los dispositivos con:
  - Información completa (nombre, sensorId, zona, ubicación)
  - Estado del dispositivo (activo/inactivo/desconocido) con badges de color
  - Última lectura recibida
  - Parámetros soportados por cada dispositivo
  - Diseño moderno con cards responsivas
- ✅ **Filtrado automático**: Los usuarios solo ven dispositivos de su empresa (excepto superadmin)
- ✅ **Manejo de errores**: Muestra mensajes claros cuando no hay dispositivos o hay errores

### 2. Vista de Zonas (`frontend/src/views/Zonas.jsx`)
- ✅ **Eliminado hardcode**: Ya no muestra "Zona 1" y "Zona 2" fijas
- ✅ **Datos reales**: Extrae zonas únicas de los dispositivos registrados
- ✅ **Estadísticas por zona**:
  - Número de dispositivos (activos/total)
  - Promedio de PM2.5, PM10 y temperatura
  - Badges de color según calidad del aire
- ✅ **Cálculo dinámico**: Usa lecturas recientes para calcular promedios

### 3. Vista de Histórico (`frontend/src/views/Historico.jsx`)
- ✅ **Implementada completamente**: 
  - Tabla con todas las lecturas históricas
  - Filtros por dispositivo, fecha desde y fecha hasta
  - Exportación a CSV
  - Formato de fechas legible
  - Muestra todos los parámetros ambientales

### 4. Permisos de Superadmin
- ✅ **Ya implementados en backend**: Los controladores ya tienen lógica para superadmin:
  - `lectura.controller.js`: Superadmin ve todas las lecturas (sin filtro por empresa)
  - `dispositivo.controller.js`: Superadmin ve todos los dispositivos
  - `empresa.controller.js`: Solo superadmin puede crear empresas y ver lista completa

## 🔍 Problema Identificado: Lecturas MQTT No Se Guardan

### Síntomas
- Los scripts de simulación se ejecutan sin errores
- Los dispositivos se crean correctamente en la BD
- **PERO**: No hay lecturas en `db.lecturas.find()`
- El frontend muestra "No hay lecturas disponibles"

### Posibles Causas
1. **Backend no conectado a MQTT**: El backend puede no estar conectándose al broker
2. **Error en certificados**: Los certificados pueden estar incorrectos o en rutas incorrectas
3. **Tópico incorrecto**: El backend puede estar suscrito a un tópico diferente al que publican los scripts
4. **Error silencioso**: El backend puede estar recibiendo mensajes pero fallando al guardarlos

### Script de Diagnóstico
Se creó `backend/scripts/check-mqtt-connection.js` para verificar la conexión MQTT.

## 🚀 Próximos Pasos para Diagnosticar MQTT

### 1. Verificar Logs del Backend
```bash
# Ver logs del backend en tiempo real
docker logs backend --tail 50 -f

# Buscar mensajes relacionados con MQTT
docker logs backend | grep -i mqtt
```

### 2. Ejecutar Script de Diagnóstico
```bash
# Copiar script al contenedor
docker cp backend/scripts/check-mqtt-connection.js backend:/app/scripts/

# Ejecutar diagnóstico
docker exec backend node /app/scripts/check-mqtt-connection.js
```

### 3. Verificar Conexión MQTT del Backend
```bash
# Verificar que el backend esté corriendo
docker ps | grep backend

# Verificar variables de entorno MQTT
docker exec backend env | grep MQTT

# Verificar certificados
docker exec backend ls -la /app/certs/
```

### 4. Verificar que el Backend Esté Suscrito
En los logs del backend deberías ver:
- `📡 Conectado al broker MQTT`
- `📥 Suscripto al tópico iot/aire/lectura`

### 5. Probar Publicación Manual
```bash
# Publicar un mensaje de prueba directamente
docker exec mosquitto mosquitto_pub \
  -h localhost \
  -p 8883 \
  --cafile /mosquitto/certs/ca/ca.crt \
  --cert /mosquitto/certs/clients/nodo01/client.crt \
  --key /mosquitto/certs/clients/nodo01/client.key \
  -t "iot/aire/lectura" \
  -m '{"sensorId":"esp32-air-001","pm25":25.5,"pm10":35.2,"timestamp":"2026-01-25T12:00:00Z"}'
```

### 6. Verificar Logs de Mosquitto
```bash
# Ver logs del broker MQTT
docker logs mosquitto --tail 50 -f

# Buscar conexiones del backend
docker logs mosquitto | grep backend_smca
```

## 📝 Notas sobre Permisos

### Superadmin
- ✅ Puede ver **todas** las empresas
- ✅ Puede ver **todos** los dispositivos (de todas las empresas)
- ✅ Puede ver **todas** las lecturas (de todas las empresas)
- ✅ Puede crear empresas y usuarios

### Admin
- ✅ Puede ver solo dispositivos de su empresa
- ✅ Puede ver solo lecturas de su empresa
- ✅ Puede gestionar usuarios de su empresa

### Supervisor / Visitante
- ✅ Pueden ver solo datos de su empresa (según implementación actual)

## 🔧 Archivos Modificados

1. `frontend/src/views/Dispositivos.jsx` - Completamente reescrito
2. `frontend/src/views/Zonas.jsx` - Completamente reescrito
3. `frontend/src/views/Historico.jsx` - Creado desde cero
4. `backend/scripts/check-mqtt-connection.js` - Nuevo script de diagnóstico

## ⚠️ Pendiente

- [ ] Verificar por qué las lecturas MQTT no se guardan
- [ ] Asegurar que el backend esté conectado y suscrito a MQTT
- [ ] Verificar que los mensajes MQTT se procesen correctamente
- [ ] Probar el flujo completo: Script → MQTT → Backend → BD → Frontend
