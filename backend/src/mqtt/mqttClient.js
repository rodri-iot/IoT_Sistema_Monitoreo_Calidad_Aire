
const mqtt = require('mqtt');
const fs = require('fs');
const Lectura = require('../db/Lectura');
const Dispositivo = require('../db/Dispositivo');
const { logger } = require('../utils/logger');

let client;

function connectMQTT() {
  const options = {
    clientId: process.env.CLIENT_ID,
    rejectUnauthorized: true,
    ca: fs.readFileSync(process.env.CA_CERT),
    cert: fs.readFileSync(process.env.CLIENT_CERT),
    key: fs.readFileSync(process.env.CLIENT_KEY)
  };

  client = mqtt.connect(process.env.MQTT_HOST, options);

  client.on('connect', () => {
    logger('📡 Conectado al broker MQTT');
    client.subscribe(process.env.MQTT_TOPIC, (err) => {
      if (err) logger('❌ Error al suscribirse al tópico');
      else logger(`📥 Suscripto al tópico ${process.env.MQTT_TOPIC}`);
    });
  });

  client.on('message', async (topic, message) => {
    try {
      const rawData = JSON.parse(message.toString());
      logger(`📨 Mensaje recibido: ${message.toString()}`);
      
      // Validar que el sensorId exista
      const dispositivo = await Dispositivo.findOne({ sensorId: rawData.sensorId });
      if (!dispositivo) {
        logger(`⚠️ Dispositivo ${rawData.sensorId} no encontrado. Ignorando lectura.`);
        return;
      }

      // Extraer valores ambientales (todos los campos excepto metadata)
      const valores = new Map();
      const camposExcluidos = ['sensorId', 'zona', 'timestamp', 'version', 'calidad', 'metadata', 'tipo', 'fuente'];
      
      Object.keys(rawData).forEach(key => {
        if (!camposExcluidos.includes(key) && typeof rawData[key] === 'number') {
          valores.set(key, rawData[key]);
        }
      });

      if (valores.size === 0) {
        logger(`⚠️ No se encontraron valores numéricos en la lectura de ${rawData.sensorId}`);
        return;
      }

      // Crear lectura con nuevo schema
      const lectura = new Lectura({
        sensorId: rawData.sensorId,
        empresaId: dispositivo.empresa,
        dispositivoId: dispositivo._id,
        timestamp: rawData.timestamp ? new Date(rawData.timestamp) : new Date(),
        zona: rawData.zona || dispositivo.zona,
        valores: valores,
        version: rawData.version,
        calidad: rawData.calidad,
        metadata: {
          tipo: rawData.metadata?.tipo || 'telemetria',
          fuente: rawData.metadata?.fuente || 'mqtt'
        }
      });

      await lectura.save();

      // Actualizar última lectura del dispositivo
      dispositivo.ultimaLectura = lectura.timestamp;
      dispositivo.estado = 'activo';
      await dispositivo.save();

      logger(`✅ Lectura guardada: ${rawData.sensorId} (${valores.size} parámetros)`);
    } catch (err) {
      logger('❌ Error al procesar mensaje MQTT:', err);
    }
  });

  client.on('error', (err) => logger('❌ Error en cliente MQTT:', err));
}

module.exports = { connectMQTT };