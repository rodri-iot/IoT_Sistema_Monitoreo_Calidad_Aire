
# 📘 Requerimientos Frontend – SMCA

Este documento detalla las vistas, componentes y funcionalidades clave de la aplicación web para el **Sistema de Monitoreo de Calidad del Aire (SMCA)**.

---

## 🧭 Vistas del sistema

### 1. `/dashboard` – Dashboard General
- Indicadores:
  - Estado del broker MQTT (conectado/desconectado)
  - Número de nodos activos
  - Estado general de la calidad del aire por zona (semáforo AQI)
- Mapa de nodos activos
- Componente: `ZonaResumen.jsx`
- Componente: `SensorCard.jsx`
- Componente: `Navbar.jsx`

---

### 2. `/zona/:zonaId` – Dashboard por Zona
- Calidad del aire promedio (por parámetros)
- Cantidad de nodos activos
- Última lectura de cada nodo
- Evolución histórica por parámetro (gráficos)
- Componente: `ZonaCharts.jsx` (a crear)
- Componente: `ZonaResumen.jsx`

---

### 3. `/dispositivo/:sensorId` – Dashboard por Nodo
- Última lectura del sensor
- Tabla de lecturas recientes
- Gráficos por parámetro (últimas 24h)
- Estado del nodo (conectado / offline)
- Componente: `SensorCard.jsx`
- Componente: `SensorCharts.jsx`

---

### 4. `/historico` – Búsqueda avanzada / Exportación
- Filtros:
  - Fecha / Hora
  - Zona
  - Nodo
  - Parámetro
- Tabla de resultados con exportación CSV / Excel
- Visualización gráfica opcional
- Componente: `FiltroHistorico.jsx`
- Componente: `TablaResultados.jsx` (a crear)

---

### 5. `/admin` – Panel de Administración
- Gestión de zonas y dispositivos
- Configuración de umbrales
- Visualización de logs y estado general del sistema
- Componente: `PanelAdmin.jsx` (a crear)
- Componente: `FormularioZona.jsx`, `FormularioNodo.jsx`

---

### 6. `/public` – Vista simplificada para visitantes
- Muestra resumen AQI por zona (sin login)
- Último estado reportado
- Posible formulario simple de acceso
- Componente: `VistaPublica.jsx`

---

## 🧱 Componentes Clave

| Componente           | Función principal |
|----------------------|-------------------|
| `Navbar.jsx`         | Navegación superior + estado del broker |
| `Dashboard.jsx`      | Vista principal de resumen |
| `SensorCard.jsx`     | Lectura individual de sensor |
| `SensorCharts.jsx`   | Gráficos de parámetros por nodo |
| `ZonaResumen.jsx`    | Consolidado de datos por zona |
| `FiltroHistorico.jsx`| Filtros avanzados para `/historico` |
| `Alerta.jsx`         | Modal o toast de alerta |

---

## 🔐 Seguridad y control

- Uso de JWT futuro para login/admin
- Datos privados visibles solo con autenticación
- Vista pública `/public` no requiere login

---

## 📦 Datos esperados en el frontend

```json
{
  "sensorId": "esp32-001",
  "zona": "microcentro",
  "timestamp": "2025-04-01T12:00:00Z",
  "pm25": 35.4,
  "pm10": 51.2,
  "no2": 25.3,
  "co2": 800,
  "co": 0.4,
  "tvoc": 120,
  "temperatura": 22.5,
  "humedad": 50.1,
  "presion": 1013.2
}
```

---

## 📌 Siguientes pasos

1. Crear archivos base: `Dashboard.jsx`, `Navbar.jsx`, `SensorCard.jsx`
2. Mostrar lectura simulada desde backend vía REST
3. Agregar estado del broker en `Navbar.jsx`
4. Añadir filtros simples en `/historico`
5. Crear primer gráfico (ej: evolución PM2.5)
