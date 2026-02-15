
/**
 * Modelo Lectura - Con Bucket Pattern y Atributos Dinámicos
 * Soporta 2-8+ parámetros ambientales variables por dispositivo
 */
const mongoose = require('mongoose');

const lecturaSchema = new mongoose.Schema({
  sensorId: { 
    type: String, 
    required: true, 
    index: true 
  },
  empresaId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Empresa', 
    required: true,
    index: true 
  },
  dispositivoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Dispositivo' 
  },
  timestamp: { 
    type: Date, 
    default: Date.now, 
    required: true, 
    index: true 
  },
  zona: { 
    type: String, 
    required: true 
  },
  zonaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zona',
    default: null
  },
  aqi: {
    type: Number,
    min: 0,
    max: 500,
    default: null
  },
  aqiParametro: {
    type: String,
    default: null
  },
  
  // ⭐ Atributos dinámicos usando Map
  // Permite almacenar cualquier parámetro ambiental sin modificar el schema
  valores: {
    type: Map,
    of: Number,
    required: true
  },
  // Ejemplo: valores = { pm25: 25.5, pm10: 30.2, co2: 450, temperatura: 22.3 }
  
  // Metadatos opcionales
  version: String, // Versión del firmware/sensor
  calidad: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  metadata: {
    tipo: { 
      type: String, 
      enum: ['telemetria', 'status', 'evento'], 
      default: 'telemetria' 
    },
    fuente: { 
      type: String, 
      enum: ['mqtt', 'api', 'sync'], 
      default: 'mqtt' 
    }
  }
}, { 
  collection: 'lecturas',
  timestamps: false // Usamos timestamp manual
});

// ⭐ Índices compuestos para queries optimizadas
lecturaSchema.index({ sensorId: 1, timestamp: -1 });
lecturaSchema.index({ empresaId: 1, timestamp: -1 });
lecturaSchema.index({ timestamp: -1 });
// Índices para queries por parámetro específico
lecturaSchema.index({ 'valores.pm25': 1 });
lecturaSchema.index({ 'valores.pm10': 1 });
lecturaSchema.index({ 'valores.co2': 1 });
lecturaSchema.index({ zonaId: 1, timestamp: -1 });
lecturaSchema.index({ aqi: 1 });

module.exports = mongoose.model('Lectura', lecturaSchema);
