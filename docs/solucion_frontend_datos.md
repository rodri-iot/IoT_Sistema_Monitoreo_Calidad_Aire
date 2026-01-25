# 🔧 Solución: Frontend No Muestra Datos

## ❌ Problema

El frontend no muestra los datos del usuario después de que se guardaron lecturas en la base de datos.

## ✅ Soluciones

### Opción 1: Refrescar la Página (Más Simple)

1. **Presiona F5 o Cmd+R** para refrescar la página
2. El Dashboard debería cargar las lecturas automáticamente

### Opción 2: Cerrar Sesión y Volver a Iniciar

1. Haz clic en "Salir" (logout)
2. Inicia sesión nuevamente con `admin@airiot.com` / `admin123`
3. Esto refresca el token y carga los datos actualizados

### Opción 3: Reiniciar el Frontend (Si las anteriores no funcionan)

```bash
# Si el frontend está corriendo en Docker
docker compose restart frontend

# Si el frontend está corriendo localmente
# Presiona Ctrl+C en la terminal donde corre
# Luego ejecuta:
cd frontend
npm run dev
```

### Opción 4: Limpiar Cache del Navegador

1. Abre las herramientas de desarrollador (F12)
2. Click derecho en el botón de refrescar
3. Selecciona "Vaciar caché y volver a cargar de forma forzada"

## 🔍 Verificación

### 1. Verificar que el Token es Válido

Abre la consola del navegador (F12) y ejecuta:
```javascript
// Verificar token
localStorage.getItem('token')

// Verificar usuario
JSON.parse(localStorage.getItem('user'))
```

Deberías ver:
- Un token largo (string JWT)
- Un objeto usuario con `correo`, `rol`, y posiblemente `empresa`

### 2. Verificar que la API Responde

En la consola del navegador, ejecuta:
```javascript
fetch('/api/lecturas/ultimas?limite=5', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => console.log('Lecturas:', data))
```

Deberías ver un array con las lecturas.

### 3. Verificar Logs del Backend

```bash
docker logs backend --tail 30
```

Deberías ver:
- `📨 Mensaje recibido: ...`
- `✅ Lectura guardada: esp32-air-001`

### 4. Verificar Base de Datos

```bash
docker exec mongo mongosh smca --eval "db.lecturas.find().count()" --quiet
```

Debería mostrar un número mayor a 0.

## 🐛 Problemas Comunes

### Problema: "No hay token de autenticación"

**Solución**: Cierra sesión y vuelve a iniciar sesión.

### Problema: "Error 401 o 403"

**Solución**: 
1. El token puede haber expirado (válido por 8 horas)
2. Cierra sesión y vuelve a iniciar

### Problema: "Lecturas recibidas: 0"

**Causas posibles**:
1. El usuario no tiene `empresaId` en el token
2. Las lecturas pertenecen a otra empresa
3. El filtro del backend está funcionando correctamente (solo muestra lecturas de tu empresa)

**Solución**:
- Verifica que estás logueado con el usuario correcto (`admin@airiot.com`)
- Verifica que las lecturas tienen `empresaId` correcto en la BD

### Problema: Dashboard muestra "No hay lecturas disponibles"

**Verificar**:
1. ¿Hay lecturas en la BD? (ver paso 4 arriba)
2. ¿El usuario tiene `empresaId` en el token?
3. ¿Las lecturas tienen el mismo `empresaId` que el usuario?

## ✅ Checklist

- [ ] Refrescar la página (F5)
- [ ] Verificar token en localStorage
- [ ] Verificar que la API responde correctamente
- [ ] Verificar que hay lecturas en la BD
- [ ] Verificar que el usuario tiene `empresaId` correcto
- [ ] Si nada funciona, reiniciar el frontend
