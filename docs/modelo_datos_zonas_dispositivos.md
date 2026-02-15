# Modelo de Datos: Zonas y Dispositivos

## Relación: Zona (1) → (N) Dispositivos

```
┌─────────────────┐         ┌─────────────────────┐         ┌─────────────────┐
│     Empresa     │         │        Zona          │         │   Dispositivo    │
├─────────────────┤         ├─────────────────────┤         ├─────────────────┤
│ _id: ObjectId   │───┐     │ _id: ObjectId       │◄────────│ zonaId: ObjectId │
│ nombre: String  │   │     │ nombre: String      │         │ zona: String     │  ← redundante
│ usuarios: []    │   └────►│ empresaId: ObjectId │         │ sensorId: String │
└─────────────────┘         │ descripcion: String  │         │ empresa: ObjectId│
                            │ esPublica: Boolean   │         └─────────────────┘
                            └─────────────────────┘
                                     │
                                     │ 1:N
                                     ▼
                            ┌─────────────────────┐
                            │      Lectura        │
                            ├─────────────────────┤
                            │ zonaId: ObjectId    │  ← referencia a Zona
                            │ zona: String        │  ← redundante (para MQTT)
                            │ sensorId: String    │
                            │ valores: Map        │
                            └─────────────────────┘
```

## Campos clave

### Zona
- **`_id`** (ObjectId): Identificador único de la zona
- **`nombre`** (String): Ej. "Planta A", "Planta C"
- **`empresaId`** (ObjectId): Empresa a la que pertenece la zona
- **`esPublica`** (Boolean): Si aparece en la vista pública

### Dispositivo
- **`zonaId`** (ObjectId, ref: Zona): **Referencia principal** a la zona asignada
- **`zona`** (String): Nombre de la zona. Se mantiene por compatibilidad con MQTT y búsquedas legacy

### Lectura
- **`zonaId`** (ObjectId, ref: Zona): Copiado del dispositivo al guardar
- **`zona`** (String): Nombre de la zona (viene del mensaje MQTT o del dispositivo)

## Flujo de datos

1. **Crear dispositivo**: Se asigna a una Zona (por nombre o zonaId). El backend resuelve y guarda `zonaId`.
2. **MQTT → Lectura**: Al recibir una lectura, se copia `dispositivo.zonaId` a `lectura.zonaId`.
3. **Consultas**: Preferir filtrar por `zonaId` para joins eficientes; `zona` (string) como fallback.
