# SMCA · Sitio y demo

Sitio estático (Vite + React) con:

- **Proyecto**: resumen, videos, memoria, repositorios.
- **Sistema** y **Firmware**: arquitectura con diagramas SVG propios (tema claro/oscuro).
- **Demo**: dashboard con datos **simulados** de Colegiales (CABA), login simulado por rol y vista pública.

No usa backend. Los datos salen de `src/data/engine.js`: un generador determinista (misma marca de tiempo → misma lectura) con ciclos diarios de tránsito, variación meteorológica y estacional, y el cálculo de AQI de `src/data/aqi.js` (misma lógica EPA que `backend/src/utils/aqiCalculator.js`). Los sensores y zonas se definen en `src/data/sites.js` (ubicaciones ilustrativas).

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # dist/
```

Despliegue: Vercel, *Root Directory* `portfolio`. Mapas: teselas de OpenStreetMap (© colaboradores de OpenStreetMap).
