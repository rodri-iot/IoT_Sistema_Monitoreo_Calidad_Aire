const mongoose = require('mongoose')

const empresaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  usuarios: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }]
})

module.exports = mongoose.model('Empresa', empresaSchema)