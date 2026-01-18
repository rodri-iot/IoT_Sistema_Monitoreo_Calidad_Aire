const mongoose = require('mongoose')

const dispositivoSchema = new mongoose.Schema({
  sensorId: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  zona: { type: String, required: true },
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa', required: true },
  nombreEmpresa: { type: String },
  descripcion: { type: String },
  estado: { type: String, enum: ['activo', 'inactivo', 'desconocido'], default: 'desconocido' },
  fechaRegistro: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Dispositivo', dispositivoSchema)