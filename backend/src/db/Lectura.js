
const mongoose = require('mongoose');

const lecturaSchema = new mongoose.Schema({
  sensorId: { type: String, required: true },
  zona: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  pm25: Number,
  pm10: Number,
  no2: Number,
  co2: Number,
  co: Number,
  tvoc: Number,
  temperatura: Number,
  humedad: Number,
  presion: Number
}, { collection: 'lecturas' });

module.exports = mongoose.model('Lectura', lecturaSchema);


/*
Define el esquema lecturaSchema con todos los campos 
ambientales clave, y lo mapea a la colección lecturas 
*/
