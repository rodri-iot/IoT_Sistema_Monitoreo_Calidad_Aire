# Despliegue del frontend (Vite) en S3 + CloudFront — `air.mydatavibe.com`

El frontend del repo es **Vite + React** (`npm run build` genera la carpeta **`dist/`**).

El dominio publico del sitio sera **`https://air.mydatavibe.com`**. La API debe seguir en otro origen (por ejemplo **`https://smca.mydatavibe.com`** en EC2); no reutilices el mismo registro DNS para S3 y para el backend.

Guia relacionada del backend: [despliegue-aws-ec2.md](./despliegue-aws-ec2.md).

---

## 1. Variables de entorno en local y en produccion

### Desarrollo (`frontend/.env`)

Ejemplo actual del repo:

```dotenv
VITE_API_URL=http://127.0.0.1:3000
VITE_APP_TIMEZONE=America/Argentina/Buenos_Aires
```

- **`VITE_API_URL`**: solo la usa **`vite.config.js`** para el **proxy del servidor de desarrollo** (`/api` → backend). **No** reescribe los `fetch('/api/...')` del codigo en el build de produccion.
- **`VITE_APP_TIMEZONE`**: la usa el bundle via `import.meta.env.VITE_APP_TIMEZONE` (p. ej. `frontend/src/utils/dateTime.js`).

### Por que hace falta CloudFront para `/api` en produccion

Las peticiones del frontend son a rutas **relativas** (`/api/login`, `/api/zonas`, etc.). En el navegador eso es **el mismo host que la web**: `https://air.mydatavibe.com/api/...`.

Si CloudFront solo apuntara a S3, esas rutas no existirian. En el **paso 5** se agrega un **origen adicional** que reenvia **`/api/*`** al backend HTTPS (p. ej. `smca.mydatavibe.com`).

### `.env.production` (recomendado para timezone)

Crea **`frontend/.env.production`** para el build de release:

```dotenv
VITE_APP_TIMEZONE=America/Argentina/Buenos_Aires
```

Opcional: `VITE_API_URL=https://smca.mydatavibe.com` (no cambia los `fetch` actuales; sirve si en el futuro usas esa variable como base URL en el cliente).

### Build

```bash
cd frontend
npm install
npm run build
```

Salida: carpeta **`frontend/dist/`**.

---

## 2. AWS: certificado TLS (ACM) — region **us-east-1**

CloudFront solo puede usar certificados de ACM creados en **N. Virginia (`us-east-1`)**.

1. Consola AWS → **Certificate Manager** → region **us-east-1**.
2. **Request** → certificado publico.
3. Nombre de dominio: **`air.mydatavibe.com`**.
4. Validacion: **DNS**.
5. Copia el registro **CNAME** de validacion que muestra ACM (lo agregas en Hostinger en el paso 4).

Espera a que el estado pase a **Issued** antes de asociar el certificado a CloudFront.

---

## 3. AWS: bucket S3

1. **S3** → **Create bucket**.
2. Nombre: globalmente unico (ej. `smca-air-frontend-prod`); no hace falta que coincida con el dominio.
3. Region: por ejemplo **`us-east-1`** (coherente con certificado y CloudFront).
4. **Block all public access**: dejalo activado; el acceso publico lo dara **CloudFront** con **Origin Access Control (OAC)**.
5. Crea el bucket.

(No habilites "Static website hosting" como unico mecanismo si usas CloudFront + HTTPS con dominio propio; el origen sera el bucket con OAC.)

---

## 4. Hostinger: DNS para validar ACM y para el sitio

En la zona DNS de **`mydatavibe.com`**:

### 4.1 Validacion del certificado

Anade el **CNAME** exacto que indica ACM (nombre y valor). Sin eso el certificado no pasa a **Issued**.

### 4.2 Subdominio `air` hacia CloudFront

Cuando tengas la distribucion CloudFront creada (paso 5), anade:

| Tipo   | Host / nombre | Valor / destino                    |
|--------|----------------|------------------------------------|
| CNAME  | `air`          | `dxxxxxxxxxx.cloudfront.net`       |

(sin `https://`; el valor es el **domain name** de la distribucion.)

TTL: por defecto o 300 s. La propagacion puede tardar minutos u horas.

---

## 5. AWS: distribucion CloudFront (S3 + proxy `/api` al backend)

### 5.1 Origen S3 (default)

1. **CloudFront** → **Create distribution**.
2. **Origin 1**: bucket S3 (lista; tipo S3 con **OAC**).
3. Crea **Origin Access Control** y acepta actualizar la **bucket policy** del bucket.
4. **Viewer protocol policy**: **Redirect HTTP to HTTPS**.
5. **Alternate domain name (CNAME)**: `air.mydatavibe.com`.
6. **Custom SSL certificate**: ACM **Issued** en **us-east-1**.
7. **Default root object**: `index.html`.

El **comportamiento por defecto** (`Default (*)` ) debe usar este origen S3.

### 5.2 Origen API (custom) y comportamiento `/api/*`

1. En la misma distribucion → pestaña **Origins** → **Create origin**.
2. Tipo **Origin domain**: escribe la URL publica del API **sin path**, por ejemplo `smca.mydatavibe.com` (CloudFront completara como origen HTTPS al 443 si corresponde).
3. **Protocol**: **HTTPS only** (recomendado si ya tenes TLS en EC2 / reverse proxy).
4. **Minimum origin SSL protocol**: segun tu servidor.

Luego **Behaviors** → **Create behavior** (debe quedar **por encima** del comportamiento default, mas especifico primero):

| Campo | Valor sugerido |
|--------|----------------|
| **Path pattern** | `/api/*` |
| **Origin** | El origen custom `smca.mydatavibe.com` (o el que uses) |
| **Viewer protocol policy** | Redirect HTTP to HTTPS |
| **Cache policy** | **CachingDisabled** (o equivalente; el API no debe cachearse como estatico) |
| **Origin request policy** | **AllViewerExceptHostHeader** o una politica que reenvie **Authorization**, cookies y query string (JWT y filtros en query). |

Guarda los cambios. El orden de behaviors importa: **`/api/*`** antes que `Default (*)` → S3.

> Si el backend solo escucha en el puerto **3000** sin HTTPS en el dominio, primero necesitas **Nginx/Caddy** en EC2 con TLS en `443` que haga proxy a `localhost:3000` (como en [despliegue-aws-ec2.md](./despliegue-aws-ec2.md)); el origen custom de CloudFront debe ser ese **HTTPS en 443**.

### 5.3 SSE (`/api/sse/...`)

Server-Sent Events pueden necesitar **mayor timeout** hacia el origen. En el origen API, revisa **Custom origin response timeout** (por defecto a veces es corto para SSE). Si el stream se corta, subi el timeout en la consola de CloudFront para ese origen.

### 5.4 SPA (React Router)

**Error pages** (Custom error responses) en la distribucion:

- **403** → **200** → `/index.html` (TTL minimo o 0).
- **404** → **200** → `/index.html` si al recargar rutas internas falla.

Guarda **Distribution ID** y **Domain name** (`*.cloudfront.net`) para DNS y despliegues. Estado **Deployed** antes de probar `air.mydatavibe.com`.

---

## 6. Subir el build a S3 y limpiar cache

Con **AWS CLI** configurado (`aws configure`):

```bash
cd frontend
npm run build

aws s3 sync ./dist s3://NOMBRE-DEL-BUCKET --delete

aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

- Sustitui `NOMBRE-DEL-BUCKET` y `DISTRIBUTION_ID`.
- La invalidacion evita que los usuarios vean una version vieja en cache.

---

## 7. Comprobaciones

- Abri `https://air.mydatavibe.com` en incognito.
- En DevTools → Network: las peticiones deben ir a **`https://air.mydatavibe.com/api/...`** (mismo host; CloudFront las reenvia al origen API).
- Si ves **502/504** en `/api/*`, revisa que el origen custom sea alcanzable con **HTTPS**, certificado valido y que el security group permita trafico desde internet (o desde rangos de CloudFront si restringis por IP).
- CORS: el navegador ve origen `https://air.mydatavibe.com` pidiendo la misma URL al viewer; el backend recibe la peticion desde CloudFront. El proyecto usa `cors()` abierto en `backend/src/server.js`; si mas adelante restringis origenes, inclui `https://air.mydatavibe.com`.

---

## 8. Resumen de arquitectura

| Subdominio / URL | Rol |
|------------------|-----|
| `smca.mydatavibe.com` | API HTTPS (EC2 + proxy TLS en 443). Origen **secundario** de CloudFront para `/api/*`. |
| `air.mydatavibe.com` | CNAME → CloudFront: HTML/JS/CSS desde S3; `/api/*` reenviado al origen anterior. |

Si mas adelante moves la API a otro host, edita solo el **origen custom** y el behavior `/api/*` en CloudFront (no hace falta rebuild del frontend mientras sigan siendo rutas relativas `/api`).

---

## 9. Problemas comunes

| Sintoma | Causa probable |
|---------|----------------|
| `GET /api/...` 403 desde S3 / XML de S3 | Falta behavior `/api/*` o esta debajo del default; o path no coincide. |
| 502 Bad Gateway en API | Origen custom mal (puerto, TLS, host); backend caido; certificado TLS en origen rechazado por CloudFront. |
| Login o JWT fallan | Origin request policy no reenvia cabecera **Authorization** o cookies. |
| SSE se corta | Timeout corto en el origen API hacia CloudFront. |
| Certificado ACM no valida | CNAME de validacion mal en Hostinger. |
| Dominio `air` sin HTTPS | Certificado no en **us-east-1** o CNAME de `air` no apunta al distribution domain. |
| Rutas SPA al recargar fallan | Falta 403/404 → `index.html`. |
| Cambios de UI no se ven | Sin `create-invalidation` tras `s3 sync`. |

---

## 10. Referencias en el repo

- Build: `frontend/package.json` (`vite build` → `dist/`).
- Proxy solo en dev: `frontend/vite.config.js` (`VITE_API_URL`).
- Variables cliente: `frontend/.env`, `frontend/.env.production` (`VITE_APP_TIMEZONE`, etc.).
- Backend CORS: `backend/src/server.js`.
