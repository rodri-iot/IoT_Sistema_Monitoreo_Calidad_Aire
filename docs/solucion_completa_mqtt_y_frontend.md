# 🔧 Solución Completa: MQTT y Frontend

## ❌ Problemas Identificados

### 1. ACL Denegando Publicaciones
- **Síntoma**: Logs de Mosquitto muestran `Denied PUBLISH from esp32-air-001`
- **Causa**: El ACL no permitía que los dispositivos publiquen en `iot/aire/lectura`
- **Solución**: Reordenar las reglas del ACL para que la regla de `iot/aire/#` esté primero

### 2. Script Reportando Falsos Éxitos
- **Síntoma**: El script dice "Exitosas: 20" pero Mosquitto deniega
- **Causa**: El callback de `publish` no recibe errores cuando Mosquitto deniega
- **Solución**: Mejorar la detección de errores en el script

### 3. Frontend No Muestra Dispositivos
- **Síntoma**: Vista de Dispositivos está vacía aunque hay 3 en la BD
- **Causa**: El controlador puede no estar filtrando correctamente por `empresaId`
- **Solución**: Mejorar el controlador para manejar `empresaId` correctamente

### 4. No Hay Lecturas en BD
- **Síntoma**: `db.lecturas.find()` retorna vacío
- **Causa**: Las publicaciones están siendo denegadas, por lo que el backend nunca las recibe
- **Solución**: Corregir el ACL primero, luego las lecturas se guardarán automáticamente

## ✅ Cambios Realizados

### 1. ACL Reordenado (`mqtt/config/acl`)
```acl
# Regla movida al PRINCIPIO para que se aplique a todos los usuarios
topic write iot/aire/#

# Luego las reglas específicas por usuario
pattern readwrite smca/%u/#
topic read smca/+/public/#
```

**Importante**: En Mosquitto, el orden de las reglas importa. Las reglas más generales deben ir primero.

### 2. Script Mejorado (`backend/scripts/simulate-esp32.js`)
- Verifica que el cliente esté conectado antes de publicar
- Mejor manejo de errores
- Mensaje informativo sobre verificar logs de Mosquitto

### 3. Controlador Mejorado (`backend/src/controllers/dispositivo.controller.js`)
- Maneja correctamente `empresaId` vs `empresa`
- Mejor manejo de errores
- Popula la información de empresa para el frontend

## 🔄 Pasos para Aplicar los Cambios

### 1. Reiniciar Mosquitto (CRÍTICO)
```bash
docker compose restart mosquitto
```

**Espera 5-10 segundos** para que Mosquitto cargue el nuevo ACL.

### 2. Verificar que Mosquitto Cargó el ACL
```bash
docker logs mosquitto --tail 20
```

No deberías ver errores relacionados con el ACL.

### 3. Copiar Script Actualizado
```bash
docker cp backend/scripts/simulate-esp32.js backend:/app/scripts/
```

### 4. Ejecutar Simulación
```bash
docker exec backend node /app/scripts/simulate-esp32.js
```

### 5. Verificar Logs de Mosquitto
```bash
docker logs mosquitto --tail 50 -f
```

**Deberías ver**: Publicaciones exitosas (sin "Denied PUBLISH")

### 6. Verificar Logs del Backend
```bash
docker logs backend --tail 50 -f
```

**Deberías ver**: 
- `📨 Mensaje recibido: ...`
- `✅ Lectura guardada: esp32-air-001 (X parámetros)`

### 7. Verificar Base de Datos
```bash
docker exec mongo mongosh smca --eval "db.lecturas.find().count()" --quiet
```

**Deberías ver**: Un número mayor a 0

### 8. Verificar Frontend
1. Inicia sesión con `admin@airiot.com` / `admin123`
2. Ve a "Dispositivos" - deberías ver 3 dispositivos
3. Ve a "Zonas" - deberías ver las zonas de los dispositivos
4. Ve a "Dashboard" - deberías ver lecturas recientes

## 🔍 Verificación Completa

### Verificar Lecturas en BD
```bash
docker exec mongo mongosh smca --eval "db.lecturas.find().sort({timestamp: -1}).limit(5).pretty()" --quiet
```

### Verificar Estado de Dispositivos
```bash
docker exec mongo mongosh smca --eval "db.dispositivos.find({}, {sensorId: 1, estado: 1, ultimaLectura: 1}).pretty()" --quiet
```

Los dispositivos deberían tener:
- `estado: 'activo'`
- `ultimaLectura: ISODate(...)`

### Verificar Frontend - Consola del Navegador
1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña "Console"
3. Deberías ver: `📱 Dispositivos recibidos: 3`
4. Si ves errores, compártelos

## 🐛 Troubleshooting

### Si Mosquitto Sigue Denegando

1. **Verificar que el ACL se cargó**:
   ```bash
   docker exec mosquitto cat /mosquitto/config/acl
   ```
   Deberías ver `topic write iot/aire/#` al principio.

2. **Verificar permisos del archivo ACL**:
   ```bash
   ls -la mqtt/config/acl
   ```
   Debería ser legible.

3. **Reiniciar todo el stack**:
   ```bash
   docker compose down
   docker compose up -d
   ```

### Si el Frontend No Muestra Dispositivos

1. **Verificar token en localStorage**:
   - Abre DevTools → Application → Local Storage
   - Verifica que hay un `token` y un `user`

2. **Verificar respuesta del API**:
   - Abre DevTools → Network
   - Busca la petición a `/api/dispositivos`
   - Verifica el status code y la respuesta

3. **Verificar usuario logueado**:
   - En la consola del navegador, ejecuta:
   ```javascript
   JSON.parse(localStorage.getItem('user'))
   ```
   Deberías ver un objeto con `correo`, `rol`, y posiblemente `empresa`

### Si No Hay Lecturas en BD

1. **Verificar que el backend está recibiendo mensajes**:
   ```bash
   docker logs backend | grep "Mensaje recibido"
   ```

2. **Verificar que el dispositivo existe**:
   ```bash
   docker exec mongo mongosh smca --eval "db.dispositivos.findOne({sensorId: 'esp32-air-001'})" --quiet
   ```

3. **Verificar logs de errores del backend**:
   ```bash
   docker logs backend | grep -i error
   ```

## 📝 Notas Importantes

1. **El ACL debe recargarse**: Después de cambiar el ACL, **SIEMPRE** reinicia Mosquitto
2. **El orden importa**: En Mosquitto ACL, las reglas más generales deben ir primero
3. **Verificar logs**: Siempre verifica los logs de Mosquitto después de ejecutar scripts
4. **Token de usuario**: El frontend necesita un token válido con `empresaId` en el payload

## ✅ Checklist Final

- [ ] Mosquitto reiniciado y ACL cargado
- [ ] Script de simulación ejecutado sin errores
- [ ] Logs de Mosquitto muestran publicaciones exitosas (sin "Denied")
- [ ] Logs del backend muestran mensajes recibidos
- [ ] Base de datos tiene lecturas (`db.lecturas.find().count() > 0`)
- [ ] Dispositivos tienen `estado: 'activo'` y `ultimaLectura` actualizada
- [ ] Frontend muestra dispositivos correctamente
- [ ] Frontend muestra lecturas en Dashboard
