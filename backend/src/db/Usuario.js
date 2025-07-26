const mongoose = require('mongoose')

const usuarioSchema = new mongoose.Schema({
  correo: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, enum: ['admin', 'supervisor', 'superadmin'], default: 'admin' },
  empresa: { type: mongoose.Schema.Types.ObjectId, ref: 'Empresa' }
})

module.exports = mongoose.model('Usuario', usuarioSchema)
