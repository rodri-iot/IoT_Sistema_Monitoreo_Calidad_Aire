const Dispositivo = require('../db/Dispositivo')

const crearDispositivo = async (req, res) => {
  try {
    const { sensorId, nombre, zona, empresa, ubicacion, descripcion, parametrosSoportados } = req.body

    const existente = await Dispositivo.findOne({ sensorId })
    if (existente) return res.status(400).json({ error: 'Ya existe un dispositivo con ese sensorId' })

    // Validar ubicación
    if (!ubicacion || !ubicacion.lat || !ubicacion.lng) {
      return res.status(400).json({ error: 'La ubicación (lat, lng) es requerida' })
    }

    const nuevo = new Dispositivo({
      sensorId,
      nombre,
      zona,
      empresa,
      ubicacion: {
        lat: ubicacion.lat,
        lng: ubicacion.lng
      },
      descripcion,
      parametrosSoportados: parametrosSoportados || [],
      estado: 'inactivo'
    })
    await nuevo.save()
    res.status(201).json(nuevo)
  } catch (err) {
    console.error('Error al crear dispositivo:', err)
    res.status(500).json({ error: 'Error al crear dispositivo' })
  }
}

const listarDispositivos = async (req, res) => {
  try {
    let dispositivos
    if (req.user.rol === 'superadmin') {
      // Superadmin ve todos los dispositivos
      dispositivos = await Dispositivo.find().populate('empresa', 'nombre')
    } else {
      // Otros usuarios ven solo dispositivos de su empresa
      const empresaId = req.user.empresaId || req.user.empresa
      if (!empresaId) {
        return res.status(403).json({ error: 'Usuario no asociado a una empresa' })
      }
      dispositivos = await Dispositivo.find({ empresa: empresaId }).populate('empresa', 'nombre')
    }
    res.json(dispositivos)
  } catch (err) {
    console.error('Error al obtener dispositivos:', err)
    res.status(500).json({ error: 'Error al obtener dispositivos' })
  }
}

const editarDispositivo = async (req, res) => {
  try {
    const id = req.params.id
    const { nombre, zona, descripcion, estado, ubicacion, parametrosSoportados } = req.body

    const updateData = {
      nombre,
      zona,
      descripcion,
      estado
    }

    if (ubicacion) {
      updateData.ubicacion = {
        lat: ubicacion.lat,
        lng: ubicacion.lng
      }
    }

    if (parametrosSoportados) {
      updateData.parametrosSoportados = parametrosSoportados
    }

    const actualizado = await Dispositivo.findByIdAndUpdate(id, updateData, { new: true })

    res.json(actualizado)
  } catch (err) {
    console.error('Error al actualizar dispositivo:', err)
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