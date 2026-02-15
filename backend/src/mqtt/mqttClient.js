
const mqtt = require('mqtt');
const fs = require('fs');
const Lectura = require('../db/Lectura');
const Dispositivo = require('../db/Dispositivo');
const { logger } = require('../utils/logger');
const { calcularAQI } = require('../utils/aqiCalculator');

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

  const topicLWT = process.env.MQTT_TOPIC_LWT || 'iot/aire/status';
  const topics = [process.env.MQTT_TOPIC, topicLWT];

  client.on('connect', () => {
    logger('📡 Conectado al broker MQTT');
    client.subscribe(topics, (err) => {
      if (err) logger('❌ Error al suscribirse a tópicos');
      else logger(`📥 Suscripto a ${topics.join(', ')}`);
    });
  });

  client.on('message', async (topic, message) => {
    try {
      if (topic === topicLWT) {
        const data = JSON.parse(message.toString());
        logger(`📴 LWT recibido: ${message.toString()}`);
        const dispositivo = await Dispositivo.findOne({ sensorId: data.sensorId });
        if (dispositivo) {
          dispositivo.estado = 'inactivo';
          await dispositivo.save();
          logger(`📴 LWT: ${data.sensorId} marcado como inactivo`);
        } else {
          logger(`⚠️ LWT: dispositivo ${data.sensorId} no encontrado en BD`);
        }
        return;
      }

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

      const PARAM_VARIANTES = {
        temperatura: ['temp', 'temperature', 'temperatura'],
        humedad: ['hum', 'humidity', 'humedad'],
        // Futuros: pm25: ['pm25', 'pm2.5'], etc.
      };
      const aliasToCanonical = {};
      Object.entries(PARAM_VARIANTES).forEach(([canonical, variantes]) => {
        variantes.forEach(v => { aliasToCanonical[v] = canonical; });
      });

      // const aliasToCanonical = { temp: 'temperatura', temperature: 'temperatura', humidity: 'humedad' };

      Object.keys(rawData).forEach(key => {
        if (!camposExcluidos.includes(key) && typeof rawData[key] === 'number') {
          const canonical = aliasToCanonical[key] || key;
          if (!valores.has(canonical)) valores.set(canonical, rawData[key]);
        }
      });

      if (valores.size === 0) {
        logger(`⚠️ No se encontraron valores numéricos en la lectura de ${rawData.sensorId}`);
        return;
      }

      const zonaNombre = rawData.zona || dispositivo.zona;

      // Resolver zonaId si el dispositivo no lo tiene (legacy)
      let zonaId = dispositivo.zonaId;
      if (!zonaId && zonaNombre && dispositivo.empresa) {
        const Zona = require('../db/Zona');
        let z = await Zona.findOne({ nombre: zonaNombre, empresaId: dispositivo.empresa });
        if (!z) {
          z = new Zona({ nombre: zonaNombre, empresaId: dispositivo.empresa, descripcion: `Zona: ${zonaNombre}`, esPublica: false });
          await z.save();
        }
        zonaId = z._id;
        dispositivo.zonaId = zonaId;
      }

      const { aqi, parametro: aqiParametro } = calcularAQI(valores);

      const lecturaData = {
        sensorId: rawData.sensorId,
        empresaId: dispositivo.empresa,
        dispositivoId: dispositivo._id,
        timestamp: rawData.timestamp ? new Date(rawData.timestamp) : new Date(),
        zona: zonaNombre,
        valores: valores,
        version: rawData.version,
        calidad: rawData.calidad,
        metadata: {
          tipo: rawData.metadata?.tipo || 'telemetria',
          fuente: rawData.metadata?.fuente || 'mqtt'
        }
      };

      if (aqi != null) {
        lecturaData.aqi = aqi;
        lecturaData.aqiParametro = aqiParametro;
      }
      if (zonaId) {
        lecturaData.zonaId = zonaId;
      }

      const lectura = new Lectura(lecturaData);

      await lectura.save();

      // Actualizar última lectura del dispositivo
      dispositivo.ultimaLectura = lectura.timestamp;
      dispositivo.estado = 'activo';
      await dispositivo.save();

      logger(`✅ Lectura guardada: ${rawData.sensorId} (${valores.size} parámetros)${aqi != null ? ` AQI: ${aqi}` : ''}`);
    } catch (err) {
      logger('❌ Error al procesar mensaje MQTT:', err);
    }
  });

  client.on('error', (err) => logger('❌ Error en cliente MQTT:', err));
}

module.exports = { connectMQTT };