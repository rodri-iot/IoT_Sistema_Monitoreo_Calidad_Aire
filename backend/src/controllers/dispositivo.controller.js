const Dispositivo = require('../db/Dispositivo')

const crearDispositivo = async (req, res) => {
  try {
    const { sensorId, nombre, zona, empresa, nombreEmpresa, descripcion } = req.body

    const existente = await Dispositivo.findOne({ sensorId })
    if (existente) return res.status(400).json({ error: 'Ya existe un dispositivo con ese sensorId' })

    const nuevo = new Dispositivo({
      sensorId,
      nombre,
      zona,
      empresa,
      nombreEmpresa,
      descripcion,
      estado: 'inactivo'
    })
    await nuevo.save()
    res.status(201).json(nuevo)
  } catch (err) {
    res.status(500).json({ error: 'Error al crear dispositivo' })
  }
}

const listarDispositivos = async (req, res) => {
  try {
    let dispositivos
    if (req.user.rol === 'superadmin') {
      dispositivos = await Dispositivo.find()
    } else {
      dispositivos = await Dispositivo.find({ empresa: req.user.empresa })
    }
    res.json(dispositivos)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener dispositivos' })
  }
}

const editarDispositivo = async (req, res) => {
  try {
    const id = req.params.id
    const { nombre, zona, descripcion, estado } = req.body

    const actualizado = await Dispositivo.findByIdAndUpdate(id, {
      nombre,
      zona,
      descripcion,
      estado
    }, { new: true })

    res.json(actualizado)
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar dispositivo' })
  }
}

const eliminarDispositivo = async (req, res) => {
  try {
    const id = req.params.id
    await Dispositivo.findByIdAndDelete(id)
    res.json({ mensaje: 'Dispositivo eliminado' })
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar dispositivo' })
  }
}

const actualizarEstadoDesdeMQTT = async ({ sensorId, zona }) => {
  try {
    const dispositivo = await Dispositivo.findOne({ sensorId })
    if (dispositivo) {
      dispositivo.estado = 'activo'
      if (zona) dispositivo.zona = zona
      await dispositivo.save()
    }
  } catch (err) {
    console.error('Error al actualizar estado del dispositivo desde MQTT:', err.message)
  }
}

module.exports = {
  crearDispositivo,
  listarDispositivos,
  editarDispositivo,
  eliminarDispositivo,
  actualizarEstadoDesdeMQTT
}