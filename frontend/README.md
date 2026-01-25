# 🎨 Frontend - Sistema de Monitoreo de Calidad del Aire

## 🚀 Levantar el Frontend

El frontend se levanta por separado del backend para permitir despliegues independientes.

### 📋 Prerrequisitos

- Node.js 18+ instalado
- Backend corriendo en `http://localhost:3000` (o la URL configurada)

### 🔧 Configuración

#### 1. Variables de Entorno

Crea un archivo `.env` en la raíz de `frontend/`:

```bash
# URL del backend API
VITE_API_URL=http://localhost:3000
```

**Opciones según el entorno:**

- **Desarrollo local**: `VITE_API_URL=http://localhost:3000`
- **Docker (misma red)**: `VITE_API_URL=http://backend:3000`
- **Producción**: `VITE_API_URL=https://api.tudominio.com`

### 📦 Instalación y Ejecución

#### Opción 1: Desarrollo Local (Recomendado)

```bash
cd frontend

# Instalar dependencias (solo la primera vez)
npm install

# Levantar en modo desarrollo
npm run dev
```

El frontend estará disponible en: **http://localhost:5173**

#### Opción 2: Docker (Desarrollo)

```bash
# Desde la raíz del proyecto
cd frontend

# Construir la imagen
docker build -t smca-frontend .

# Ejecutar el contenedor
docker run -d \
  --name frontend \
  -p 5173:5173 \
  -e VITE_API_URL=http://localhost:3000 \
  smca-frontend
```

**Nota:** Si el backend está en Docker en la misma red, usa el nombre del servicio:
```bash
docker run -d \
  --name frontend \
  --network iot_sistema_monitoreo_calidad_aire_smca_net \
  -p 5173:5173 \
  -e VITE_API_URL=http://backend:3000 \
  smca-frontend
```

#### Opción 3: Producción (Build Estático)

Para producción, construye la aplicación y sírvela con un servidor web:

```bash
# Construir para producción
npm run build

# Preview local del build (opcional, para testing)
npm run preview
```

El build estará en `frontend/dist/` y puede servirse con Nginx, Apache, o cualquier servidor estático.

### 🔗 Conexión con el Backend

El frontend se conecta al backend a través de:

1. **Proxy de Vite** (desarrollo): Las peticiones a `/api/*` se redirigen al backend configurado en `VITE_API_URL`
2. **Rutas relativas**: El código usa `/api/...` que funcionan gracias al proxy

### 📝 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo (Vite)
- `npm run build` - Construir para producción
- `npm run preview` - Previsualizar el build de producción

### 🐛 Troubleshooting

#### El frontend no se conecta al backend

1. Verifica que el backend esté corriendo
2. Verifica `VITE_API_URL` en `.env`
3. Verifica que el proxy en `vite.config.js` esté configurado correctamente
4. Si usas Docker, verifica que los contenedores estén en la misma red

#### Error de CORS

El proxy de Vite debería manejar CORS automáticamente. Si hay problemas:
- Verifica `vite.config.js` tiene `changeOrigin: true` en el proxy
- Asegúrate de que el backend permita el origen del frontend

#### Puerto 5173 ya está en uso

Cambia el puerto con:
```bash
PORT=3001 npm run dev
```

O modifica `vite.config.js` para cambiar el puerto por defecto.

### 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/    # Componentes reutilizables
│   ├── context/       # Context API (AuthContext)
│   ├── views/         # Vistas/páginas
│   ├── App.jsx        # Componente principal
│   └── main.jsx       # Punto de entrada
├── public/            # Archivos estáticos
├── package.json       # Dependencias
├── vite.config.js     # Configuración de Vite
└── Dockerfile         # Configuración Docker
```
