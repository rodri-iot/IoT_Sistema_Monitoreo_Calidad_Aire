const Dispositivo = require('../db/Dispositivo')
const Zona = require('../db/Zona')
const Empresa = require('../db/Empresa')

function esObjectIdValido(val) {
  if (!val) return false
  const str = String(val)
  return /^[a-f0-9]{24}$/i.test(str)
}

/** Resuelve zona (nombre o zonaId) a ObjectId de Zona. Crea la zona si no existe. Valida que la zona pertenezca a la empresa. */
async function resolverZonaId(zona, empresaId) {
  if (!zona) return null
  const idStr = typeof zona === 'object' ? zona?.toString?.() : String(zona)
  if (/^[a-f0-9]{24}$/i.test(idStr)) {
    const z = await Zona.findById(idStr)
    if (z && empresaId && z.empresaId.toString() !== empresaId.toString()) {
      return null // Zona pertenece a otra empresa
    }
    if (z) return z._id
  }
  const nombre = String(zona).trim()
  if (!nombre) return null
  let z = await Zona.findOne({ nombre, empresaId })
  if (!z) {
    z = new Zona({ nombre, empresaId, descripcion: `Zona: ${nombre}`, esPublica: false })
    await z.save()
  }
  return z._id
}

const crearDispositivo = async (req, res) => {
  try {
    const { sensorId, nombre, zona, empresa, ubicacion, descripcion, parametrosSoportados, esPublico } = req.body

    const existente = await Dispositivo.findOne({ sensorId })
    if (existente) return res.status(400).json({ error: 'Ya existe un dispositivo con ese sensorId' })

    // Validar ubicación
    if (!ubicacion || !ubicacion.lat || !ubicacion.lng) {
      return res.status(400).json({ error: 'La ubicación (lat, lng) es requerida' })
    }

    let empId = empresa || req.user.empresaId || req.user.empresa
    if (!empId) return res.status(400).json({ error: 'empresa es requerida' })
    if (!esObjectIdValido(empId)) {
      const emp = await Empresa.findOne({ nombre: String(empId).trim() })
      if (emp) empId = emp._id
      else return res.status(400).json({ error: 'empresa no válida' })
    }
    if (!zona || !String(zona).trim()) return res.status(400).json({ error: 'zona es requerida' })

    const zonaId = await resolverZonaId(zona, empId)
    if (!zonaId) return res.status(400).json({ error: 'Zona no válida o no pertenece a esta empresa' })

    const nuevo = new Dispositivo({
      sensorId,
      nombre,
      zona: String(zona).trim(),
      zonaId,
      empresa: empId,
      ubicacion: {
        lat: ubicacion.lat,
        lng: ubicacion.lng
      },
      descripcion,
      esPublico: esPublico || false,
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
    const { nombre, zona, descripcion, estado, ubicacion, parametrosSoportados, esPublico } = req.body

    const dispositivo = await Dispositivo.findById(id)
    if (!dispositivo) return res.status(404).json({ error: 'Dispositivo no encontrado' })

    const updateData = {}
    if (nombre !== undefined) updateData.nombre = nombre
    if (zona !== undefined) {
      updateData.zona = String(zona).trim()
      const empId = dispositivo.empresa
      const zonaId = await resolverZonaId(zona, empId)
      if (!zonaId) return res.status(400).json({ error: 'Zona no válida o no pertenece a esta empresa' })
      updateData.zonaId = zonaId
    }
    if (descripcion !== undefined) updateData.descripcion = descripcion
    if (estado !== undefined) updateData.estado = estado
    if (esPublico !== undefined) updateData.esPublico = esPublico

    if (ubicacion) {
      updateData.ubicacion = {
        lat: ubicacion.lat,
        lng: ubicacion.lng
      }
    }

    if (parametrosSoportados) {
      updateData.parametrosSoportados = parametrosSoportados
    }

    const actualizado = await Dispositivo.findByIdAndUpdate(id, { $set: updateData }, { new: true })

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