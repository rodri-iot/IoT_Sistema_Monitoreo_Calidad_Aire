/**
 * Modelo Dispositivo - Versión Mejorada
 * Incluye ubicación y parámetros soportados
 */
const mongoose = require('mongoose')

const dispositivoSchema = new mongoose.Schema({
  sensorId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  nombre: { 
    type: String, 
    required: true 
  },
  zona: { 
    type: String, 
    required: true 
  },
  empresa: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Empresa', 
    required: true,
    index: true 
  },
  ubicacion: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  descripcion: String,
  estado: { 
    type: String, 
    enum: ['activo', 'inactivo', 'desconocido'], 
    default: 'desconocido' 
  },
  fechaRegistro: { 
    type: Date, 
    default: Date.now 
  },
  ultimaLectura: Date,
  parametrosSoportados: [String] // Ej: ['pm25', 'pm10', 'co2', 'temperatura', 'humedad']
}, { 
  collection: 'dispositivos',
  timestamps: false
})

// Índices adicionales
dispositivoSchema.index({ empresa: 1, estado: 1 })
dispositivoSchema.index({ zona: 1 })

module.exports = mongoose.model('Dispositivo', dispositivoSchema)
