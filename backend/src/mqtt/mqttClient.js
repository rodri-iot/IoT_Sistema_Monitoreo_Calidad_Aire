
const mqtt = require('mqtt');
const fs = require('fs');
const Lectura = require('../db/Lectura');
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
      const data = JSON.parse(message.toString());
      logger(`📨 Mensaje recibido: ${message.toString()}`);
      const lectura = new Lectura(data);
      await lectura.save();
      logger('✅ Lectura guardada en MongoDB');
    } catch (err) {
      logger('❌ Error al procesar mensaje MQTT:', err);
    }
  });

  client.on('error', (err) => logger('❌ Error en cliente MQTT:', err));
}

module.exports = { connectMQTT };