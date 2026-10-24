# 📡 Información de Conexión MQTT para ESP32

## 🔌 Configuración del Broker MQTT

### Host y Puerto

**Para ESP32 en la misma máquina (localhost):**
- **Host**: `localhost` o `127.0.0.1`
- **Puerto**: `8883`
- **Protocolo**: `mqtts://` (MQTT sobre TLS)

**Para ESP32 en la misma red local:**
- **Host**: IP de tu máquina (ej: `192.168.1.100`)
- **Puerto**: `8883`
- **Protocolo**: `mqtts://`

**Para ESP32 en red externa (producción):**
- **Host**: Dominio o IP pública del servidor
- **Puerto**: `8883`
- **Protocolo**: `mqtts://`

### URL Completa

```
mqtts://localhost:8883
```

O si está en otra máquina:
```
mqtts://192.168.1.100:8883
```

## 📜 Certificados Requeridos

Los ESP32 necesitan estos certificados para conectarse:

1. **CA Certificate**: `mqtt/certs/ca/ca.crt`
2. **Client Certificate**: `mqtt/certs/clients/{DEVICE_ID}/client.crt`
3. **Client Key**: `mqtt/certs/clients/{DEVICE_ID}/client.key`

Donde `{DEVICE_ID}` es el CN del certificado (ej: `nodo01`, `nodo02`, `esp32-air-001`, etc.)

## 📤 Tópico de Publicación

```
iot/aire/lectura
```

## 📋 Formato del Mensaje

El ESP32 debe enviar un JSON con este formato:

```json
{
  "sensorId": "esp32-air-001",
  "timestamp": "2026-01-25T12:00:00Z",
  "pm25": 25.5,
  "pm10": 30.2,
  "co2": 450,
  "temperatura": 22.5,
  "humedad": 60.0
}
```

**Campos requeridos:**
- `sensorId`: Debe coincidir con un dispositivo registrado en la BD
- `timestamp`: ISO 8601 (opcional, se usa la fecha actual si no se envía)

**Campos opcionales:**
- Cualquier parámetro ambiental numérico (pm25, pm10, co2, no2, co, tvoc, temperatura, humedad, etc.)
- `version`: Versión del firmware (ej: "v1.0.0")
- `calidad`: Calidad de la lectura (0-100)
- `metadata`: Objeto con información adicional

## 🔐 Autenticación

- **Tipo**: TLS Mutual Authentication (certificados)
- **CN del certificado**: Se usa como identificador del dispositivo
- **El `sensorId` en el mensaje**: Debe coincidir con un dispositivo registrado en la BD

## 📝 Notas Importantes

1. **El `sensorId` debe existir en la BD**: El backend busca el dispositivo por `sensorId` y obtiene la empresa automáticamente.

2. **Certificados válidos**: El ESP32 debe usar certificados generados con el mismo CA que el servidor.

3. **Puerto 8883**: Es el puerto para MQTT sobre TLS. El puerto 1883 (MQTT sin TLS) está expuesto pero no se usa en esta configuración.

4. **QoS**: Se recomienda usar QoS 1 para asegurar la entrega del mensaje.

## 📴 LWT (Last Will and Testament)

El LWT permite que el broker publique un mensaje automáticamente cuando el ESP32 se desconecta de forma abrupta (corte de luz, WiFi, crash). El backend marca el dispositivo como inactivo al recibir este mensaje.

### Parámetros LWT

| Parámetro | Valor |
|-----------|-------|
| **Will Topic** | `iot/aire/status` |
| **Will Message** | `{"sensorId":"<TU_SENSOR_ID>","estado":"offline"}` |
| **Will QoS** | 1 |
| **Will Retain** | true |

### Condiciones

- **sensorId**: Debe ser el mismo que se usa en las lecturas y que está registrado en la BD.
- **Momento**: El LWT se configura en la llamada a `connect()`, no se publica manualmente.
- **Cuándo se dispara**: Solo cuando el ESP32 se desconecta abruptamente (sin `disconnect()`). Si hace `disconnect()` correctamente, el broker no publica el LWT.

### Ejemplo PubSubClient (Arduino)

```cpp
const char* willTopic = "iot/aire/status";
char willMessage[64];
snprintf(willMessage, sizeof(willMessage),
         "{\"sensorId\":\"%s\",\"estado\":\"offline\"}", SENSOR_ID);

mqttClient.connect(
  clientId.c_str(),
  "", "",           // user, pass (vacío si usas solo certs)
  willTopic,
  1,                // willQoS
  true,             // willRetain
  willMessage
);
```

### Ejemplo ESP-IDF (esp_mqtt_client)

```c
char will_msg[64];
snprintf(will_msg, sizeof(will_msg),
         "{\"sensorId\":\"%s\",\"estado\":\"offline\"}", SENSOR_ID);

esp_mqtt_client_config_t mqtt_cfg = {
    // ... broker, credentials, TLS ...
    .lwt = {
        .topic = "iot/aire/status",
        .msg = will_msg,
        .msg_len = 0,
        .qos = 1,
        .retain = true,
    },
};
```

## 🌐 Ejemplo de Configuración

Si tu máquina tiene la IP `192.168.1.100` en la red local:

```
Broker: mqtts://192.168.1.100:8883
Topic: iot/aire/lectura
CA Cert: mqtt/certs/ca/ca.crt
Client Cert: mqtt/certs/clients/nodo01/client.crt
Client Key: mqtt/certs/clients/nodo01/client.key
```

## 🔍 Verificar IP de tu Máquina

**En macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**En Windows:**
```bash
ipconfig
```

Busca la IP de tu interfaz de red (ej: `192.168.1.100`, `10.0.0.5`, etc.)
