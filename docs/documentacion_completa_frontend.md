# 📚 Documentación Completa del Frontend - SMCA

## 📋 Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Sistema de Diseño](#sistema-de-diseño)
4. [Estructura de Componentes](#estructura-de-componentes)
5. [Vistas y Funcionalidades](#vistas-y-funcionalidades)
6. [Autenticación y Autorización](#autenticación-y-autorización)
7. [Rutas y Navegación](#rutas-y-navegación)
8. [Estado Global](#estado-global)
9. [Comunicación con Backend](#comunicación-con-backend)
10. [Áreas de Mejora](#áreas-de-mejora)

---

## 🏗️ Arquitectura General

### Estructura de Carpetas

```
frontend/src/
├── components/          # Componentes reutilizables
│   ├── Navbar.jsx       # Barra de navegación principal
│   ├── RequireAuth.jsx  # Componente de protección de rutas
│   └── ModalUsuario.jsx # Modal para editar usuarios
├── context/             # Context API para estado global
│   └── AuthContext.jsx  # Contexto de autenticación
├── views/               # Vistas/páginas principales
│   ├── Dashboard.jsx    # Dashboard principal
│   ├── Login.jsx        # Página de inicio de sesión
│   ├── Dispositivos.jsx # Gestión de dispositivos
│   ├── Zonas.jsx        # Visualización de zonas
│   ├── Historico.jsx    # Histórico de lecturas
│   ├── Lecturas.jsx     # Vista de lecturas (placeholder)
│   ├── Usuarios.jsx     # Gestión de usuarios (placeholder)
│   ├── Empresas.jsx     # Crear empresas (superadmin)
│   ├── EmpresasAdmin.jsx # Gestión de empresas (superadmin)
│   ├── VistaPublica.jsx # Vista pública sin autenticación
│   └── Unauthorized.jsx # Vista de acceso no autorizado
├── App.jsx              # Componente raíz y rutas
├── App.css              # Estilos globales
└── main.jsx             # Punto de entrada
```

### Patrón de Arquitectura

- **Framework**: React 18.2.0 con hooks
- **Routing**: React Router DOM v6
- **Estado Global**: Context API (sin Redux)
- **Estilos**: CSS inline + Materialize CSS (parcialmente)
- **Build Tool**: Vite 5.0

---

## 🛠️ Stack Tecnológico

### Dependencias Principales

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.30.1",
  "materialize-css": "^1.0.0"
}
```

**Confirmación de Requerimientos:**
- ✅ **React**: Correctamente implementado y siendo utilizado en todo el proyecto
- ✅ **Materialize CSS**: Instalado e importado correctamente en `main.jsx`

### DevDependencies

```json
{
  "vite": "^5.0.0",
  "@vitejs/plugin-react": "^4.0.0"
}
```

### Configuración de Vite

- **Proxy**: Redirige `/api/*` al backend configurado en `VITE_API_URL`
- **Host**: `0.0.0.0` para compatibilidad con Docker
- **Puerto**: `5173` (desarrollo)
- **Logging**: Proxy logs habilitados para debugging

### Uso de Materialize CSS

**Importación** (`frontend/src/main.jsx`):
```javascript
import 'materialize-css/dist/css/materialize.min.css'
import 'materialize-css/dist/js/materialize.min.js'
```

**Componentes Materialize CSS Utilizados:**

1. **Sistema de Grid** (`row`, `col`):
   - ✅ Usado en `Dashboard.jsx` para layout de KPIs y lecturas
   - Clases: `row`, `col s12 m6 l3`, `col s12 m6 l4`

2. **Cards** (`card`, `card-content`, `card-title`):
   - ✅ Usado en múltiples vistas (Dashboard, Dispositivos, Zonas)
   - Clases: `card`, `card-content`, `card-title`
   - Nota: Se combina con CSS inline para personalización

3. **Formularios** (`input-field`):
   - ✅ Usado en Login, Empresas, ModalUsuario
   - Clases: `input-field`, `active` (para labels)

4. **Botones** (`btn`, `btn-flat`):
   - ✅ Usado en todas las vistas con formularios
   - Clases: `btn blue darken-2`, `btn green`, `btn-flat`, `waves-effect waves-light`

5. **Modales** (`modal`, `modal-content`, `modal-footer`):
   - ✅ Usado en ModalUsuario
   - Inicialización JavaScript: `window.M.Modal.init()`

6. **Listas** (`collection`, `collection-item`):
   - ✅ Usado en EmpresasAdmin y VistaPublica
   - Clases: `collection`, `collection-item`

7. **Mensajes** (`card-panel`):
   - ✅ Usado para mensajes de éxito/error
   - Clases: `card-panel green lighten-4`, `card-panel red lighten-4`

8. **Layout** (`container`, `center`, `center-align`, `flow-text`):
   - ✅ Usado para centrado y contenedores en múltiples vistas
   - Clases: `container`, `center`, `center-align`, `flow-text`, `browser-default`

**Observaciones sobre el Uso:**

**Fortalezas:**
- Materialize CSS está correctamente instalado e importado
- Se utiliza en formularios, modales, botones, listas y sistema de grid
- La inicialización de componentes JavaScript (modales) funciona correctamente
- El sistema de grid responsive se aprovecha bien

**Áreas de Mejora:**
- Muchos componentes combinan clases de Materialize con CSS inline extensivo
- Algunos componentes (Dashboard, Dispositivos, Zonas) usan principalmente CSS inline con clases básicas de Materialize
- Se podría aprovechar más componentes de Materialize como:
  - `badge` (actualmente se usan badges personalizados)
  - `chip` (para tags/etiquetas)
  - `dropdown` (para menús desplegables)
  - `sidenav` (para navegación lateral)
  - `tabs` (para navegación por pestañas)
  - `table` (para tablas estilizadas)
  - `preloader` (para estados de carga)

**Recomendación:**
El proyecto cumple con los requerimientos de usar React y Materialize CSS. El uso actual es funcional, pero se podría optimizar reduciendo CSS inline y aprovechando más los componentes nativos de Materialize CSS para mantener consistencia y reducir código personalizado.

---

## 🎨 Sistema de Diseño

### Design Tokens (Variables CSS)

Definidos en `App.css`:

```css
:root {
  --color-good: #2ECC71;        /* Verde - Calidad buena */
  --color-moderate: #F1C40F;     /* Amarillo - Calidad moderada */
  --color-dangerous: #E67E22;     /* Naranja - Calidad peligrosa */
  --color-critical: #E74C3C;     /* Rojo - Calidad crítica */
  --color-text-primary: #2c3e50; /* Texto principal */
  --color-text-secondary: #7f8c8d; /* Texto secundario */
  --color-bg-light: #f5f5f5;     /* Fondo claro */
  --color-border: #ecf0f1;       /* Bordes */
  --shadow-soft: 0 2px 8px rgba(0,0,0,0.1);
  --shadow-card: 0 2px 6px rgba(0,0,0,0.08);
  --border-radius: 12px;         /* Radio de bordes */
}
```

### Tipografía

- **Familia**: Roboto, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **Enfoque**: Legibilidad de datos numéricos

### Paleta de Colores

#### Colores de Calidad del Aire

| Calidad | Color | Hex | Uso |
|---------|-------|-----|-----|
| Bueno | Verde | `#2ECC71` | Valores dentro de rango seguro |
| Moderado | Amarillo | `#F1C40F` | Valores aceptables pero atención |
| Peligroso | Naranja | `#E67E22` | Valores que requieren acción |
| Crítico | Rojo | `#E74C3C` | Valores críticos |

#### Colores de Roles

| Rol | Color | Hex |
|-----|-------|-----|
| Superadmin | Rojo | `#E74C3C` |
| Admin | Azul | `#3498db` |
| Supervisor | Gris | `#95a5a6` |

### Componentes Base

#### Cards
- **Border Radius**: 12px
- **Sombra**: `0 2px 8px rgba(0,0,0,0.1)`
- **Bordes**: Sin borde por defecto
- **Padding**: Variable según contexto (1.25rem - 1.5rem)

#### Badges
- **Formato**: Pills redondeados (border-radius: 20px)
- **Padding**: `0.25rem 0.75rem`
- **Tamaño de fuente**: `0.75rem - 0.85rem`

---

## 🧩 Estructura de Componentes

### 1. Navbar (`components/Navbar.jsx`)

**Propósito**: Barra de navegación principal con menú y perfil de usuario.

**Características**:
- **Color de fondo**: `#2c3e50` (gris oscuro)
- **Indicador de ruta activa**: Verde (`#2ECC71`) con subrayado
- **Menú dinámico**: Se muestra según el rol del usuario
- **Badge de rol**: Muestra el rol del usuario con color específico
- **Botón de logout**: Rojo (`#E74C3C`)

**Elementos**:
- Logo "SMCA" (izquierda)
- Enlaces de navegación (centro):
  - Dashboard (todos los roles autenticados)
  - Zonas (admin, supervisor)
  - Dispositivos (admin, supervisor)
  - Históricos (admin, supervisor)
  - Empresas (solo superadmin)
- Información de usuario (derecha):
  - Email del usuario
  - Badge de rol
  - Botón "Salir"

**Estados**:
- Usuario logueado: Muestra menú completo
- Usuario no logueado: Solo muestra "Login"

### 2. RequireAuth (`components/RequireAuth.jsx`)

**Propósito**: Componente de protección de rutas basado en roles.

**Funcionalidad**:
- Verifica si el usuario está autenticado
- Verifica si el rol del usuario está en `allowedRoles`
- Redirige a `/login` si no está autenticado
- Redirige a `/unauthorized` si no tiene permisos

**Uso**:
```jsx
<RequireAuth allowedRoles={['admin', 'supervisor']}>
  <Zonas />
</RequireAuth>
```

### 3. ModalUsuario (`components/ModalUsuario.jsx`)

**Propósito**: Modal para editar usuarios (usado en EmpresasAdmin).

**Características**:
- Usa Materialize CSS Modal
- Campos editables:
  - Correo electrónico
  - Rol (admin, supervisor, superadmin)
  - Contraseña (opcional)
- Acciones: Guardar / Cancelar

---

## 📱 Vistas y Funcionalidades

### 1. Dashboard (`views/Dashboard.jsx`)

**Ruta**: `/`
**Acceso**: Todos los usuarios autenticados (superadmin, admin, supervisor)

#### Descripción General

Vista principal que muestra un resumen de alto nivel del sistema con KPIs y lecturas recientes.

#### Componentes Visuales

**Header**:
- Título: "Dashboard Principal"
- Subtítulo: "Monitoreo en tiempo real de calidad del aire"

**KPIs Cards (Grid de 4 columnas)**:

1. **Promedio PM2.5**
   - Valor grande con color dinámico según calidad
   - Unidad: µg/m³
   - Badge de calidad (Bueno/Moderado/Peligroso/Crítico)
   - Color del valor cambia según rango:
     - ≤12: Verde (`#2ECC71`)
     - ≤35: Amarillo (`#F1C40F`)
     - ≤55: Naranja (`#E67E22`)
     - >55: Rojo (`#E74C3C`)

2. **Dispositivos Activos**
   - Contador de dispositivos únicos
   - Unidad: "unidades"
   - Indicador: "✓ En línea" (verde)
   - Color del valor: Azul (`#3498db`)

3. **Alertas Activas**
   - Contador de lecturas con PM2.5 > 55
   - Unidad: "alertas"
   - Indicador dinámico:
     - Si hay alertas: "⚠ Requiere atención" (rojo)
     - Si no hay: "✓ Todo normal" (gris)
   - Color del valor: Rojo si hay alertas, verde si no

4. **Total Lecturas**
   - Contador de lecturas mostradas
   - Unidad: "últimas"
   - Descripción: "Últimas 20 lecturas"
   - Color del valor: Púrpura (`#9b59b6`)

**Sección de Lecturas Recientes**:

- **Header**:
  - Título: "Lecturas Recientes"
  - Badge: "Actualización automática cada 30s"

- **Grid de Cards** (3 columnas en desktop):
  - Cada card representa una lectura
  - **Información mostrada**:
    - Sensor ID (negrita)
    - Zona
    - Badge de calidad PM2.5
    - Métricas:
      - PM2.5 (con color según calidad)
      - PM10 (con color según calidad)
      - CO₂ (ppm)
      - Temperatura (°C)
      - Humedad (%)
    - Timestamp formateado

- **Estados**:
  - Loading: Spinner de Materialize CSS
  - Sin datos: Mensaje "No hay lecturas disponibles"
  - Con datos: Grid de cards

#### Funcionalidades

- **Auto-refresh**: Actualiza cada 30 segundos
- **Cálculo de estadísticas**: Calcula promedios y alertas en tiempo real
- **Filtrado automático**: Solo muestra lecturas de la empresa del usuario (excepto superadmin)
- **Manejo de errores**: Muestra mensajes claros si hay problemas de autenticación

#### Lógica de Calidad del Aire

```javascript
// Rangos por parámetro
pm25: { good: 12, moderate: 35, dangerous: 55 }
pm10: { good: 20, moderate: 50, dangerous: 100 }
co2: { good: 400, moderate: 1000, dangerous: 2000 }
no2: { good: 50, moderate: 100, dangerous: 200 }
co: { good: 1, moderate: 9, dangerous: 15 }
tvoc: { good: 50, moderate: 250, dangerous: 500 }
```

### 2. Login (`views/Login.jsx`)

**Ruta**: `/login`
**Acceso**: Público (usuarios no autenticados)

#### Descripción

Página de inicio de sesión simple con Materialize CSS.

#### Componentes

- **Formulario**:
  - Campo Email (tipo email, requerido)
  - Campo Password (tipo password, requerido)
  - Botón "Ingresar" (azul, con icono de candado)
  - Botón "Acceder como visitante" (gris, redirige a `/public`)

- **Manejo de errores**:
  - Muestra mensaje de error en card-panel rojo si falla el login

#### Flujo

1. Usuario ingresa email y password
2. Se llama a `AuthContext.login()`
3. Si es exitoso: Redirige a `/` (Dashboard)
4. Si falla: Muestra mensaje de error

### 3. Dispositivos (`views/Dispositivos.jsx`)

**Ruta**: `/dispositivos`
**Acceso**: Admin, Supervisor

#### Descripción

Vista de gestión y monitoreo de dispositivos en formato de cards.

#### Componentes Visuales

**Header**:
- Título: "Dispositivos"
- Subtítulo: "Vista de gestión y monitoreo de dispositivos."

**Grid de Cards** (responsive, mínimo 350px por card):

Cada card muestra:
- **Header**:
  - Nombre del dispositivo (título grande)
  - Sensor ID (monospace, gris)
  - Badge de estado (activo/inactivo/desconocido) con color:
    - Activo: Verde (`#2ECC71`)
    - Inactivo: Gris (`#95A5A6`)
    - Desconocido: Amarillo (`#F1C40F`)

- **Información**:
  - Zona
  - Ubicación (lat, lng) si está disponible
  - Última lectura (fecha formateada) si está disponible
  - Parámetros soportados (badges pequeños, uppercase)

- **Descripción** (si existe)

**Estados**:
- Loading: Mensaje "Cargando dispositivos..."
- Error: Card rojo con mensaje de error
- Sin dispositivos: Mensaje informativo según rol
- Con dispositivos: Grid de cards

#### Interactividad

- **Hover effect**: Cards se elevan ligeramente (`translateY(-2px)`) y aumentan sombra
- **Responsive**: Grid se adapta al tamaño de pantalla

### 4. Zonas (`views/Zonas.jsx`)

**Ruta**: `/zonas`
**Acceso**: Admin, Supervisor

#### Descripción

Vista que muestra zonas de monitoreo con estadísticas agregadas.

#### Funcionalidad

- **Extracción automática**: Obtiene zonas únicas de los dispositivos registrados
- **Cálculo de promedios**: Usa lecturas recientes (últimas 100) para calcular:
  - Promedio PM2.5
  - Promedio PM10
  - Promedio de temperatura

#### Componentes Visuales

**Grid de Cards** (responsive, mínimo 300px):

Cada card de zona muestra:
- **Título**: Nombre de la zona
- **Dispositivos**: Contador "X/Y activos"
- **Panel de métricas** (si hay lecturas):
  - PM2.5 promedio (con color según calidad)
  - PM10 promedio (con color según calidad)
  - Temperatura promedio
  - Borde del panel con color según calidad PM2.5

**Estados**:
- Loading: Mensaje "Cargando zonas..."
- Error: Card rojo con mensaje
- Sin zonas: Mensaje informativo
- Sin lecturas: Mensaje "Sin lecturas disponibles"

### 5. Histórico (`views/Historico.jsx`)

**Ruta**: `/lecturas` (mapeado como "Históricos" en navbar)
**Acceso**: Admin, Supervisor

#### Descripción

Vista de análisis histórico con filtros y exportación CSV.

#### Componentes

**Filtros** (Panel superior):
- **Dispositivo**: Dropdown con todos los dispositivos disponibles
- **Fecha desde**: Input tipo date
- **Fecha hasta**: Input tipo date
- **Botones**:
  - "Aplicar Filtros" (azul)
  - "Limpiar" (gris)
  - "Exportar CSV" (verde, solo si hay datos)

**Tabla de Datos**:
- **Columnas**:
  - Fecha (formato completo con hora)
  - Sensor ID (monospace)
  - Zona
  - PM2.5 (formato: X.XX)
  - PM10 (formato: X.XX)
  - CO₂ (entero)
  - Temp (formato: X.X°C)
  - Humedad (formato: X.X%)

- **Estilo**:
  - Header oscuro (`#34495E`)
  - Filas alternadas (blanco/gris claro)
  - Bordes redondeados en la tabla

**Funcionalidades**:
- **Filtrado**:
  - Por dispositivo (usa endpoint `/api/lecturas/sensor/{sensorId}`)
  - Por fecha desde (usa endpoint `/api/lecturas/desde?fecha=...`)
  - Por fecha hasta (filtrado en cliente)
- **Exportación CSV**: Descarga archivo con todas las lecturas filtradas
- **Límite**: Muestra hasta 100 lecturas

### 6. Lecturas (`views/Lecturas.jsx`)

**Estado**: ⚠️ **PLACEHOLDER** - Solo muestra título y descripción

**Ruta**: `/lecturas`
**Acceso**: Admin, Supervisor

**Nota**: Esta vista está vacía. Probablemente debería ser similar a Histórico o combinarse con él.

### 7. Usuarios (`views/Usuarios.jsx`)

**Estado**: ⚠️ **PLACEHOLDER** - Solo muestra título y descripción

**Ruta**: `/usuarios`
**Acceso**: Solo Admin

**Nota**: Esta vista está vacía. Debería permitir gestionar usuarios de la empresa.

### 8. Empresas (`views/Empresas.jsx`)

**Ruta**: `/empresas`
**Acceso**: Solo Superadmin

#### Descripción

Formulario para crear nuevas empresas con su usuario inicial.

#### Componentes

- **Formulario**:
  - Nombre de la Empresa (texto, requerido)
  - Usuario Inicial:
    - Correo (email, requerido)
    - Rol (select: Admin o Supervisor)
    - Contraseña (password, requerido)
  - Botón "Registrar Empresa" (azul)

- **Feedback**:
  - Mensaje de éxito (card-panel verde)
  - Mensaje de error (card-panel rojo)

### 9. EmpresasAdmin (`views/EmpresasAdmin.jsx`)

**Ruta**: `/admin/empresas`
**Acceso**: Solo Superadmin

#### Descripción

Vista de gestión de empresas existentes y sus usuarios.

#### Componentes

- **Lista de Empresas**:
  - Cada empresa en un card-panel
  - Título: "Empresa X: {nombre}"
  - Lista de usuarios (collection):
    - Email del usuario
    - Rol (negrita)
    - Acciones:
      - Botón editar (naranja, icono ✏️)
      - Botón eliminar (rojo, icono 🗑️)

- **Modal de Edición**:
  - Se abre al hacer clic en "Editar"
  - Usa componente `ModalUsuario`
  - Permite editar correo, rol y contraseña

**Funcionalidades**:
- Ver todas las empresas
- Ver usuarios de cada empresa
- Editar usuarios
- Eliminar usuarios (con confirmación)

### 10. VistaPublica (`views/VistaPublica.jsx`)

**Ruta**: `/public`
**Acceso**: Público (sin autenticación)

#### Descripción

Vista simplificada para visitantes sin autenticación.

#### Componentes

- **Lista simple** (Materialize collection):
  - Muestra lecturas públicas
  - Formato: `{sensorId} | Zona: {zona} | PM2.5: {pm25} | CO₂: {co2}`

**Nota**: ⚠️ Esta vista está muy básica y probablemente necesita mejoras significativas. Actualmente intenta acceder a datos que requieren autenticación.

### 11. Unauthorized (`views/Unauthorized.jsx`)

**Ruta**: `/unauthorized`
**Acceso**: Público

#### Descripción

Vista mostrada cuando un usuario intenta acceder a una ruta sin permisos.

**Componentes**:
- Título: "Acceso denegado"
- Mensaje: "No tenés permisos para acceder a esta sección."
- Botón "Volver al inicio" (azul)

---

## 🔐 Autenticación y Autorización

### AuthContext (`context/AuthContext.jsx`)

**Propósito**: Manejar el estado de autenticación globalmente.

#### Estado

- `user`: Objeto con información del usuario (`correo`, `rol`, `empresa`)
- `token`: JWT token para autenticación en API

#### Métodos

- `login(email, password)`: 
  - Llama a `/api/login`
  - Guarda token y usuario en localStorage
  - Actualiza estado global

- `logout()`:
  - Limpia localStorage
  - Limpia estado global

#### Persistencia

- Usa `localStorage` para persistir sesión
- Se restaura automáticamente al recargar la página

### Protección de Rutas

Implementada con `RequireAuth` component:

```jsx
<RequireAuth allowedRoles={['admin', 'supervisor']}>
  <Vista />
</RequireAuth>
```

**Lógica**:
1. Verifica si hay usuario autenticado
2. Verifica si el rol está en `allowedRoles`
3. Redirige según corresponda

### Matriz de Acceso

| Vista | Superadmin | Admin | Supervisor | Público |
|-------|-----------|-------|------------|---------|
| Dashboard | ✅ | ✅ | ✅ | ❌ |
| Zonas | ❌ | ✅ | ✅ | ❌ |
| Dispositivos | ❌ | ✅ | ✅ | ❌ |
| Históricos | ❌ | ✅ | ✅ | ❌ |
| Usuarios | ❌ | ✅ | ❌ | ❌ |
| Empresas (crear) | ✅ | ❌ | ❌ | ❌ |
| Empresas (gestionar) | ✅ | ❌ | ❌ | ❌ |
| Vista Pública | ✅ | ✅ | ✅ | ✅ |

**Nota**: El superadmin actualmente no tiene acceso a Zonas, Dispositivos e Históricos según la configuración de rutas, pero debería tenerlo según la lógica del backend.

---

## 🗺️ Rutas y Navegación

### Configuración de Rutas (`App.jsx`)

```jsx
/                    → Dashboard (autenticado)
/login              → Login (público)
/public             → Vista Pública (público)
/zonas              → Zonas (admin, supervisor)
/dispositivos       → Dispositivos (admin, supervisor)
/lecturas           → Histórico (admin, supervisor)
/usuarios           → Usuarios (admin)
/empresas           → Crear Empresa (superadmin)
/admin/empresas     → Gestionar Empresas (superadmin)
/unauthorized       → Acceso Denegado (público)
```

### Navegación

- **Navbar siempre visible** (excepto posiblemente en login)
- **Indicador de ruta activa**: Verde con subrayado
- **Menú dinámico**: Se muestra según rol del usuario

---

## 📊 Estado Global

### Context API

**AuthContext**:
- `user`: Información del usuario logueado
- `token`: JWT token
- `login()`: Función de login
- `logout()`: Función de logout

### Estado Local

Cada vista maneja su propio estado con `useState`:
- `loading`: Estado de carga
- `error`: Mensajes de error
- `data`: Datos de la vista (lecturas, dispositivos, etc.)
- `filtros`: Filtros aplicados (en Histórico)

### Persistencia

- **localStorage**: Token y usuario
- **Sin persistencia de estado de vistas**: Cada vista carga datos al montarse

---

## 🔌 Comunicación con Backend

### Configuración

- **Proxy**: Vite redirige `/api/*` al backend
- **URL Base**: Configurada en `VITE_API_URL` (default: `http://127.0.0.1:3000`)

### Endpoints Utilizados

| Endpoint | Método | Vista | Propósito |
|----------|--------|-------|-----------|
| `/api/login` | POST | Login | Autenticación |
| `/api/lecturas/ultimas` | GET | Dashboard, Zonas, VistaPublica | Obtener últimas lecturas |
| `/api/lecturas/sensor/{id}` | GET | Histórico | Lecturas por dispositivo |
| `/api/lecturas/desde` | GET | Histórico | Lecturas desde fecha |
| `/api/dispositivos` | GET | Dispositivos, Zonas, Histórico | Listar dispositivos |
| `/api/empresas` | POST | Empresas | Crear empresa |
| `/api/empresas/admin/empresas` | GET | EmpresasAdmin | Listar empresas |
| `/api/usuarios/{id}` | PUT | EmpresasAdmin | Editar usuario |
| `/api/usuarios/{id}` | DELETE | EmpresasAdmin | Eliminar usuario |

### Headers de Autenticación

Todas las peticiones (excepto login y pública) incluyen:
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

### Manejo de Errores

- **401/403**: Redirige a login o muestra mensaje de autenticación
- **Otros errores**: Muestra mensaje de error en la vista
- **Sin datos**: Muestra mensaje informativo

---

## 🎯 Áreas de Mejora

### 🔴 Críticas

1. **Vista Lecturas Vacía**
   - `Lecturas.jsx` es solo un placeholder
   - **Sugerencia**: Implementar o eliminar la ruta

2. **Vista Usuarios Vacía**
   - `Usuarios.jsx` es solo un placeholder
   - **Sugerencia**: Implementar gestión completa de usuarios de la empresa

3. **Vista Pública Muy Básica**
   - Solo muestra lista simple sin diseño
   - **Sugerencia**: Rediseñar con cards y mejor UX

4. **Permisos de Superadmin Inconsistentes**
   - Superadmin no puede acceder a Zonas, Dispositivos e Históricos desde el frontend
   - **Sugerencia**: Agregar superadmin a `allowedRoles` en estas rutas

### 🟡 Importantes

5. **Gestión de Dispositivos**
   - **Falta**: Crear dispositivos desde el frontend
   - **Falta**: Editar dispositivos
   - **Falta**: Eliminar dispositivos
   - **Sugerencia**: Agregar botones y modales para CRUD completo

6. **Gestión de Zonas**
   - **Falta**: Crear zonas manualmente
   - **Falta**: Editar zonas
   - **Falta**: Eliminar zonas
   - **Actual**: Las zonas se extraen automáticamente de dispositivos
   - **Sugerencia**: Permitir gestión manual de zonas

7. **Dashboard - Gráficos**
   - **Falta**: Visualización gráfica de tendencias
   - **Sugerencia**: Agregar gráficos de línea para PM2.5, temperatura, etc.

8. **Histórico - Gráficos**
   - **Falta**: Visualización gráfica de datos históricos
   - **Sugerencia**: Agregar gráficos interactivos (Chart.js, Recharts)

9. **Notificaciones/Alertas**
   - **Falta**: Sistema de notificaciones toast
   - **Falta**: Alertas en tiempo real cuando valores superan umbrales
   - **Sugerencia**: Implementar React-Hot-Toast o similar

10. **Filtros Avanzados**
    - **Histórico**: Solo tiene filtros básicos
    - **Sugerencia**: Agregar filtros por zona, rango de valores, múltiples dispositivos

### 🟢 Mejoras de UX

11. **Loading States**
    - Algunas vistas tienen loading, otras no
    - **Sugerencia**: Estandarizar skeleton loaders

12. **Empty States**
    - Mensajes básicos cuando no hay datos
    - **Sugerencia**: Agregar ilustraciones y CTAs (Call to Action)

13. **Responsive Design**
    - Funciona pero puede mejorarse
    - **Sugerencia**: Revisar breakpoints y adaptar mejor para móviles

14. **Accesibilidad**
    - **Falta**: ARIA labels, navegación por teclado
    - **Sugerencia**: Mejorar accesibilidad

15. **Internacionalización**
    - Todo está en español hardcodeado
    - **Sugerencia**: Considerar i18n si hay planes de expansión

16. **Búsqueda y Filtros**
    - **Falta**: Búsqueda en listas de dispositivos
    - **Sugerencia**: Agregar búsqueda y filtros avanzados

17. **Exportación de Datos**
    - Solo CSV en Histórico
    - **Sugerencia**: Agregar exportación Excel, PDF, JSON

18. **Visualización de Mapas**
    - **Falta**: Mapa con ubicación de dispositivos
   - **Sugerencia**: Integrar Google Maps o Leaflet

19. **Comparativas**
    - **Falta**: Comparar datos entre zonas/dispositivos
    - **Sugerencia**: Agregar vista de comparación

20. **Configuración de Umbrales**
    - **Falta**: Permitir configurar umbrales de alerta por empresa/zona
    - **Sugerencia**: Agregar vista de configuración

### 🔵 Mejoras Técnicas

21. **Estado Global**
    - Solo AuthContext, no hay estado para datos compartidos
    - **Sugerencia**: Considerar Redux o Zustand si crece la complejidad

22. **Caché de Datos**
    - Cada vista recarga datos al montarse
    - **Sugerencia**: Implementar caché con React Query o SWR

23. **Optimistic Updates**
    - **Falta**: Actualización optimista en acciones (editar, eliminar)
    - **Sugerencia**: Implementar para mejor UX

24. **Error Boundaries**
    - **Falta**: Manejo de errores a nivel de aplicación
    - **Sugerencia**: Implementar Error Boundaries de React

25. **Testing**
    - **Falta**: Tests unitarios y de integración
    - **Sugerencia**: Agregar Jest + React Testing Library

26. **TypeScript**
    - Todo está en JavaScript
    - **Sugerencia**: Considerar migración a TypeScript para mejor mantenibilidad

27. **Componentes Reutilizables**
    - Mucho código duplicado (cards, badges, etc.)
    - **Sugerencia**: Extraer componentes reutilizables

28. **Estilos Consistentes**
    - Mezcla de CSS inline y Materialize
    - **Sugerencia**: Estandarizar sistema de estilos (CSS Modules, Styled Components, Tailwind)

---

## 📈 Métricas y KPIs Actuales

### Dashboard KPIs

1. **Promedio PM2.5**: Calculado de las últimas 20 lecturas
2. **Dispositivos Activos**: Contador de dispositivos únicos en las lecturas
3. **Alertas Activas**: Lecturas con PM2.5 > 55
4. **Total Lecturas**: Contador de lecturas mostradas (máx 20)

### Limitaciones Actuales

- **Solo últimas 20 lecturas**: No considera todo el historial
- **Cálculo en cliente**: Se hace en el frontend, podría ser más eficiente en backend
- **Sin promedios históricos**: Solo muestra promedios de las últimas lecturas

---

## 🎨 Guía de Estilo Visual

### Principios de Diseño

1. **Cards con bordes redondeados**: Consistente en toda la aplicación
2. **Sombras suaves**: Para dar profundidad sin ser intrusivo
3. **Colores semánticos**: Verde/Amarillo/Naranja/Rojo para calidad del aire
4. **Tipografía clara**: Sans-serif para legibilidad de números
5. **Espaciado generoso**: Padding y margins consistentes

### Patrones de Interacción

- **Hover effects**: Cards se elevan ligeramente
- **Loading states**: Spinners o mensajes de carga
- **Empty states**: Mensajes informativos cuando no hay datos
- **Error states**: Cards rojos con mensajes claros

### Responsive Breakpoints

- **Desktop**: Grid de 3-4 columnas
- **Tablet**: Grid de 2 columnas
- **Mobile**: Stack vertical (1 columna)

---

## 📝 Notas de Implementación

### Dependencias de Materialize CSS

- Se usa parcialmente (inputs, modals, collections)
- No se usa completamente (mucho CSS inline)
- **Consideración**: Podría eliminarse si se migra a otro sistema de diseño

### Manejo de Datos Dinámicos

- El sistema maneja atributos dinámicos (`valores` como objeto)
- Las vistas muestran solo parámetros conocidos (pm25, pm10, co2, etc.)
- **Consideración**: Podría mejorarse para mostrar todos los parámetros disponibles

### Performance

- **Auto-refresh**: Dashboard se actualiza cada 30s
- **Sin debounce**: Los filtros se aplican inmediatamente
- **Sin paginación**: Histórico muestra hasta 100 registros
- **Consideración**: Implementar paginación para grandes volúmenes

---

## 🚀 Roadmap Sugerido

### Fase 1: Completar Vistas Básicas
1. ✅ Dashboard (completo)
2. ✅ Dispositivos (completo)
3. ✅ Zonas (completo)
4. ✅ Histórico (completo)
5. ⏳ Lecturas (implementar o eliminar)
6. ⏳ Usuarios (implementar gestión completa)
7. ⏳ Vista Pública (rediseñar)
8. ⏳ Agregar superadmin a rutas de Zonas, Dispositivos, Históricos

### Fase 2: Funcionalidades CRUD
1. Crear/Editar/Eliminar dispositivos
2. Crear/Editar/Eliminar zonas
3. Gestión completa de usuarios

### Fase 3: Visualización Avanzada
1. Gráficos en Dashboard
2. Gráficos en Histórico
3. Mapa de dispositivos

### Fase 4: Mejoras de UX
1. Sistema de notificaciones
2. Filtros avanzados
3. Exportación múltiple (CSV, Excel, PDF)
4. Búsqueda y ordenamiento

### Fase 5: Optimización
1. Caché de datos
2. Paginación
3. Lazy loading
4. Error boundaries

---

## 📊 Resumen Ejecutivo

### Estado Actual

**✅ Completado**:
- Dashboard funcional con KPIs y lecturas recientes
- Vista de Dispositivos con cards informativos
- Vista de Zonas con estadísticas agregadas
- Vista de Histórico con filtros y exportación CSV
- Sistema de autenticación y autorización
- Navegación con protección de rutas

**⚠️ Parcialmente Implementado**:
- Vista Pública (muy básica)
- Gestión de Empresas (solo crear y listar)

**❌ No Implementado**:
- Vista Lecturas (placeholder)
- Vista Usuarios (placeholder)
- CRUD completo de dispositivos
- CRUD completo de zonas
- Gráficos y visualizaciones
- Sistema de notificaciones
- Acceso de superadmin a todas las vistas

### Fortalezas

1. ✅ Diseño moderno y limpio
2. ✅ Sistema de colores semántico para calidad del aire
3. ✅ Responsive (funciona en móviles)
4. ✅ Autenticación robusta
5. ✅ Manejo de errores básico

### Debilidades

1. ❌ Vistas incompletas (Lecturas, Usuarios)
2. ❌ Falta CRUD completo
3. ❌ Sin visualizaciones gráficas
4. ❌ Sin sistema de notificaciones
5. ❌ Mezcla de sistemas de estilos
6. ❌ Permisos inconsistentes para superadmin

### Recomendaciones Prioritarias

1. **Alta Prioridad**: Completar vistas Lecturas y Usuarios
2. **Alta Prioridad**: Agregar superadmin a rutas de Zonas, Dispositivos, Históricos
3. **Alta Prioridad**: Implementar CRUD de dispositivos
4. **Media Prioridad**: Agregar gráficos en Dashboard e Histórico
5. **Media Prioridad**: Sistema de notificaciones
6. **Baja Prioridad**: Migrar a sistema de estilos unificado

---

**Documento generado**: 2026-01-25
**Versión del Frontend**: 0.1.0
**Última actualización**: Análisis completo del código fuente
