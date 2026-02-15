const mongoose = require('mongoose');

const zonaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true,
    index: true
  },
  descripcion: {
    type: String,
    default: ''
  },
  limitesAQI: {
    bueno: { type: Number, default: 50 },
    moderado: { type: Number, default: 100 },
    peligroso: { type: Number, default: 150 }
  },
  esPublica: {
    type: Boolean,
    default: false
  }
}, {
  collection: 'zonas',
  timestamps: true
});

zonaSchema.index({ empresaId: 1, nombre: 1 }, { unique: true });

module.exports = mongoose.model('Zona', zonaSchema);
