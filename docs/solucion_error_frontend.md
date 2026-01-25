# 🔧 Solución: Error en Frontend - "object is not iterable"

## ❌ Problema Identificado

El backend está lanzando este error:
```
TypeError: object is not iterable (cannot read property Symbol(Symbol.iterator))
at Function.fromEntries
at /app/src/controllers/lectura.controller.js:32:23
```

**Causa**: Cuando usamos `.lean()` en Mongoose, los `Map` se convierten automáticamente a objetos planos. El código intentaba usar `Object.fromEntries()` en un objeto que ya no era un Map.

## ✅ Solución Aplicada

He corregido el controlador `lectura.controller.js` para manejar correctamente tanto Maps como objetos:

```javascript
// Antes (causaba error):
valores: Object.fromEntries(lectura.valores || new Map())

// Después (corregido):
let valores = lectura.valores;
if (valores instanceof Map) {
  valores = Object.fromEntries(valores);
} else if (!valores || typeof valores !== 'object') {
  valores = {};
}
// Si ya es un objeto, usarlo directamente
```

## 🔄 Pasos para Aplicar

### 1. Reiniciar Backend (CRÍTICO)
```bash
docker compose restart backend
```

Esto carga el código corregido.

### 2. Reiniciar Mosquitto (Para ACL)
```bash
docker compose restart mosquitto
```

Espera 10-15 segundos para que cargue el ACL actualizado.

### 3. Verificar que el Backend se Reinició
```bash
docker logs backend --tail 20
```

Deberías ver:
- `🟢 Conectado a MongoDB`
- `📡 Conectado al broker MQTT`
- `📥 Suscripto al tópico iot/aire/lectura`

### 4. Probar el Frontend

1. **Refrescar la página** (F5 o Cmd+R)
2. O **cerrar sesión y volver a iniciar** con `admin@airiot.com` / `admin123`

### 5. Verificar en la Consola del Navegador (F12)

Deberías ver:
- `📊 Lecturas recibidas: X` (donde X > 0)
- No deberías ver errores de "object is not iterable"

## 🐛 Si Sigue Sin Funcionar

### Verificar que el Backend Está Corregido

```bash
# Ver el código dentro del contenedor
docker exec backend cat /app/src/controllers/lectura.controller.js | grep -A 10 "lecturasFormateadas"
```

Deberías ver el código corregido con la verificación de `instanceof Map`.

### Verificar que la API Responde Correctamente

En la consola del navegador (F12):
```javascript
fetch('/api/lecturas/ultimas?limite=5', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('Lecturas:', data);
  console.log('Primera lectura valores:', data[0]?.valores);
})
.catch(err => console.error('Error:', err));
```

Deberías ver:
- Un array con lecturas
- Cada lectura con `valores` como un objeto (no un Map)

### Verificar Logs del Backend

```bash
docker logs backend --tail 30 | grep -i error
```

No deberías ver más errores de "object is not iterable".

## ✅ Checklist

- [ ] Backend reiniciado
- [ ] Mosquitto reiniciado (para ACL)
- [ ] Frontend refrescado o sesión reiniciada
- [ ] No hay errores en la consola del navegador
- [ ] La API responde correctamente
- [ ] Las lecturas se muestran en el Dashboard
