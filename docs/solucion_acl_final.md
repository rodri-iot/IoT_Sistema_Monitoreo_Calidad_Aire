# 🔧 Solución Final: ACL MQTT - Problema de Permisos

## ❌ Problema Identificado

A pesar de agregar `topic write iot/aire/#` al ACL, Mosquitto sigue denegando las publicaciones:
```
Denied PUBLISH from esp32-air-001_... (u'nodo01')
```

**Causa Raíz**: En Mosquitto, cuando `use_identity_as_username=true`, el CN del certificado se convierte en el username. Las reglas globales (sin `user` específico) **pueden no aplicarse correctamente** en todas las versiones de Mosquitto o configuraciones.

## ✅ Solución Aplicada

Se agregaron **reglas específicas por usuario** para cada certificado de dispositivo:

```acl
# Reglas globales (para todos los usuarios autenticados)
topic write iot/aire/#
pattern readwrite smca/%u/#
topic read smca/+/public/#

# Reglas específicas por certificado
user nodo01
topic write iot/aire/#
pattern readwrite smca/nodo01/#

user nodo02
topic write iot/aire/#
pattern readwrite smca/nodo02/#

# ... etc
```

## 🔄 Pasos para Aplicar

### 1. Reiniciar Mosquitto (CRÍTICO)
```bash
docker compose restart mosquitto
```

**Espera 10-15 segundos** para que Mosquitto cargue completamente el nuevo ACL.

### 2. Verificar que el ACL se Cargó
```bash
# Ver el ACL dentro del contenedor
docker exec mosquitto cat /mosquitto/config/acl | grep -A 2 "user nodo01"
```

Deberías ver las reglas específicas para `nodo01`.

### 3. Verificar Logs de Mosquitto al Iniciar
```bash
docker logs mosquitto --tail 30
```

No deberías ver errores relacionados con el ACL.

### 4. Ejecutar Simulación
```bash
docker exec backend node /app/scripts/simulate-esp32.js
```

### 5. Verificar Logs de Mosquitto (DEBE mostrar publicaciones exitosas)
```bash
docker logs mosquitto --tail 50 -f
```

**DEBERÍAS VER**:
- ✅ Publicaciones exitosas (sin "Denied PUBLISH")
- ✅ Mensajes como: `Received PUBLISH from esp32-air-001_...`

**NO DEBERÍAS VER**:
- ❌ `Denied PUBLISH`
- ❌ `rc135` (código de error de denegación)

### 6. Verificar Logs del Backend
```bash
docker logs backend --tail 30 -f
```

**DEBERÍAS VER**:
- ✅ `📨 Mensaje recibido: ...`
- ✅ `✅ Lectura guardada: esp32-air-001 (X parámetros)`

### 7. Verificar Base de Datos
```bash
docker exec mongo mongosh smca --eval "db.lecturas.find().count()" --quiet
```

**DEBERÍAS VER**: Un número mayor a 0

## 🔍 Si Sigue Fallando

### Verificar Certificados
```bash
# Ver el CN del certificado nodo01
openssl x509 -in mqtt/certs/clients/nodo01/client.crt -noout -subject
```

Debería mostrar: `CN = nodo01`

### Verificar que el Usuario Existe en passwords
```bash
cat mqtt/config/passwords | grep nodo01
```

Aunque no se use el password con certificados TLS, el usuario debe existir en el archivo.

### Verificar Orden del ACL
El orden importa en Mosquitto. Las reglas más específicas deben ir después de las generales, pero en este caso, las específicas por `user` tienen prioridad.

### Alternativa: Usar Patrón en Lugar de Reglas Específicas
Si tienes muchos dispositivos, puedes usar un patrón más general, pero puede ser menos seguro:

```acl
# Permitir a cualquier usuario que empiece con "nodo"
pattern write iot/aire/#
```

## 📝 Notas Importantes

1. **Cada nuevo certificado necesita su regla**: Si creas un nuevo certificado (ej: `nodo05`), debes agregar su regla al ACL.

2. **Reiniciar es obligatorio**: Después de cambiar el ACL, **SIEMPRE** reinicia Mosquitto.

3. **Verificar logs**: Siempre verifica los logs de Mosquitto después de cambios en el ACL.

4. **Orden del ACL**: Las reglas específicas por `user` tienen prioridad sobre las reglas globales.

## ✅ Checklist Final

- [ ] ACL actualizado con reglas específicas por usuario
- [ ] Mosquitto reiniciado y ACL cargado
- [ ] Logs de Mosquitto no muestran errores de ACL
- [ ] Script de simulación ejecutado
- [ ] Logs de Mosquitto muestran publicaciones exitosas (sin "Denied")
- [ ] Logs del backend muestran mensajes recibidos
- [ ] Base de datos tiene lecturas (`db.lecturas.find().count() > 0`)
- [ ] Dispositivos tienen `estado: 'activo'` y `ultimaLectura` actualizada
