# 🔧 Solución: ACL MQTT - Denied PUBLISH

## ❌ Problema Identificado

Los logs de Mosquitto mostraban:
```
Denied PUBLISH from esp32-air-001_... 'iot/aire/lectura'
```

**Causa**: El ACL solo permitía al backend (`backend_smca`) publicar en `iot/aire/#`, pero los scripts de simulación ESP32 estaban intentando publicar en `iot/aire/lectura` sin tener ese permiso.

## ✅ Solución Aplicada

Se agregó una regla al ACL (`mqtt/config/acl`) para permitir que cualquier dispositivo autenticado pueda publicar en el tópico legacy:

```acl
# 3. Permitir que los dispositivos publiquen en el tópico legacy (compatibilidad)
# Esto permite que los ESP32 publiquen directamente a iot/aire/lectura
topic write iot/aire/lectura
```

## 🔄 Pasos para Aplicar el Cambio

1. **Reiniciar Mosquitto** para cargar el nuevo ACL:
   ```bash
   docker compose restart mosquitto
   ```

2. **Verificar que Mosquitto se reinició correctamente**:
   ```bash
   docker logs mosquitto --tail 20
   ```

3. **Ejecutar el script de simulación nuevamente**:
   ```bash
   docker exec backend node /app/scripts/setup-and-simulate-air-iot.js
   ```

4. **Verificar los logs de Mosquitto** (no deberían aparecer más "Denied PUBLISH"):
   ```bash
   docker logs mosquitto --tail 50 -f
   ```

5. **Verificar que las lecturas se guardan en la BD**:
   ```bash
   docker exec mongo mongosh smca --eval "db.lecturas.find().count()" --quiet
   ```

## 📋 ACL Actualizado

El ACL ahora tiene estas reglas:

### Para Dispositivos ESP32:
- ✅ `pattern readwrite smca/%u/#` - Pueden publicar/leer en su propia jerarquía
- ✅ `topic read smca/+/public/#` - Pueden leer datos públicos de otros
- ✅ `topic write iot/aire/lectura` - **NUEVO**: Pueden publicar en tópico legacy

### Para Backend:
- ✅ `topic readwrite smca/#` - Acceso completo a toda la jerarquía
- ✅ `topic readwrite iot/aire/#` - Acceso completo al tópico legacy

## 🎯 Resultado Esperado

Después de reiniciar Mosquitto:
- ✅ Los scripts ESP32 pueden publicar en `iot/aire/lectura`
- ✅ El backend recibe los mensajes
- ✅ Las lecturas se guardan en MongoDB
- ✅ El frontend muestra las lecturas

## 🔍 Verificación

Para verificar que todo funciona:

```bash
# 1. Ver logs de Mosquitto (debería mostrar PUBLISH exitosos)
docker logs mosquitto --tail 20 -f

# 2. Ver logs del backend (debería mostrar mensajes recibidos)
docker logs backend --tail 20 -f

# 3. Verificar lecturas en BD
docker exec mongo mongosh smca --eval "db.lecturas.find().sort({timestamp: -1}).limit(5).pretty()" --quiet
```
