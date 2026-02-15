const Zona = require('../db/Zona');
const Dispositivo = require('../db/Dispositivo');
const Lectura = require('../db/Lectura');

function getEmpresaFilter(req) {
  if (req.user.rol === 'superadmin') return {};
  const empresaId = req.user.empresaId || req.user.empresa;
  if (!empresaId) return null;
  return { empresaId };
}

function getValores(lectura) {
  const v = lectura?.valores;
  if (v instanceof Map) return Object.fromEntries(v);
  return (v && typeof v === 'object') ? v : {};
}

async function listarZonas(req, res) {
  try {
    const filter = getEmpresaFilter(req);
    if (filter === null) {
      return res.status(403).json({ error: 'Usuario no asociado a una empresa' });
    }

    const horas = parseInt(req.query.horas, 10) || 12;
    const zonas = await Zona.find(filter)
      .sort({ nombre: 1 })
      .lean();

    const desde = new Date();
    desde.setHours(desde.getHours() - horas);

    const zonasConStats = await Promise.all(zonas.map(async (zona) => {
      const dispositivos = await Dispositivo.find({
        $or: [{ zonaId: zona._id }, { zona: zona.nombre }],
        empresa: zona.empresaId
      });
      const activos = dispositivos.filter(d => d.estado === 'activo').length;

      const lecturas = await Lectura.find({
        $or: [{ zonaId: zona._id }, { zona: zona.nombre }],
        ...(zona.empresaId && { empresaId: zona.empresaId }),
        timestamp: { $gte: desde }
      })
        .sort({ aqi: -1 })
        .lean();

      let maxAQI = null, minAQI = null, promedioAQI = null, promedioPM25 = null, promedioPM10 = null, promedioCO2 = null, promedioTemp = null, promedioHumedad = null, enAlerta = false;
      let lecturaPico = null;

      if (lecturas.length > 0) {
        const getV = (l) => (l.valores instanceof Map ? Object.fromEntries(l.valores) : l.valores || {});
        const aqiVals = lecturas.filter(l => l.aqi != null).map(l => l.aqi);
        maxAQI = aqiVals.length ? Math.max(...aqiVals) : null;
        minAQI = aqiVals.length ? Math.min(...aqiVals) : null;
        promedioAQI = aqiVals.length ? Math.round(aqiVals.reduce((a, b) => a + b, 0) / aqiVals.length) : null;
        enAlerta = maxAQI != null && maxAQI > 100;
        const pm25Vals = lecturas.map(l => getV(l).pm25).filter(v => v != null);
        const pm10Vals = lecturas.map(l => getV(l).pm10).filter(v => v != null);
        const co2Vals = lecturas.map(l => getV(l).co2).filter(v => v != null);
        const tempVals = lecturas.map(l => getV(l).temperatura).filter(v => v != null);
        const humedadVals = lecturas.map(l => getV(l).humedad).filter(v => v != null);
        promedioPM25 = pm25Vals.length ? (pm25Vals.reduce((a, b) => a + b, 0) / pm25Vals.length).toFixed(2) : null;
        promedioPM10 = pm10Vals.length ? (pm10Vals.reduce((a, b) => a + b, 0) / pm10Vals.length).toFixed(2) : null;
        promedioCO2 = co2Vals.length ? Math.round(co2Vals.reduce((a, b) => a + b, 0) / co2Vals.length) : null;
        promedioTemp = tempVals.length ? (tempVals.reduce((a, b) => a + b, 0) / tempVals.length).toFixed(1) : null;
        promedioHumedad = humedadVals.length ? (humedadVals.reduce((a, b) => a + b, 0) / humedadVals.length).toFixed(1) : null;

        const pico = lecturas.find(l => l.aqi != null);
        if (pico) {
          const valores = getValores(pico);
          let dispositivoNombre = null;
          if (pico.sensorId) {
            const disp = await Dispositivo.findOne({ sensorId: pico.sensorId }).select('nombre').lean();
            dispositivoNombre = disp?.nombre || pico.sensorId;
          }
          lecturaPico = {
            aqi: pico.aqi,
            valores: {
              pm25: valores.pm25,
              pm10: valores.pm10,
              co2: valores.co2,
              temperatura: valores.temperatura ?? valores.temp ?? valores.temperature,
              humedad: valores.humedad ?? valores.humidity,
              no2: valores.no2,
              co: valores.co,
              tvoc: valores.tvoc
            },
            sensorId: pico.sensorId,
            timestamp: pico.timestamp,
            dispositivoNombre
          };
        }
      }

      return {
        ...zona,
        totalDispositivos: dispositivos.length,
        dispositivosActivos: activos,
        maxAQI,
        minAQI,
        promedioAQI,
        promedioPM25,
        promedioPM10,
        promedioCO2,
        promedioTemp,
        promedioHumedad,
        enAlerta,
        lecturaPico
      };
    }));

    res.json(zonasConStats);
  } catch (err) {
    console.error('Error al listar zonas:', err);
    res.status(500).json({ error: 'Error al obtener zonas' });
  }
}

async function listarZonasPublicas(req, res) {
  try {
    const zonas = await Zona.find({ esPublica: true })
      .populate('empresaId', 'nombre')
      .sort({ nombre: 1 })
      .lean();

    const zonasConStats = await Promise.all(zonas.map(async (zona) => {
      const desde = new Date();
      desde.setHours(desde.getHours() - 24);
      const lecturas = await Lectura.find({
        $or: [{ zonaId: zona._id }, { zona: zona.nombre }],
        timestamp: { $gte: desde }
      }).lean();

      let promedioAQI = null, maxAQI = null, promedioPM25 = null, promedioCO2 = null, promedioTemp = null;
      if (lecturas && lecturas.length > 0) {
        const aqiVals = lecturas.filter(l => l.aqi != null).map(l => l.aqi);
        promedioAQI = aqiVals.length ? (aqiVals.reduce((a, b) => a + b, 0) / aqiVals.length).toFixed(1) : null;
        maxAQI = aqiVals.length ? Math.max(...aqiVals) : null;
        const pm25Vals = lecturas.map(l => (l.valores instanceof Map ? Object.fromEntries(l.valores) : l.valores || {}).pm25).filter(v => v != null);
        const co2Vals = lecturas.map(l => (l.valores instanceof Map ? Object.fromEntries(l.valores) : l.valores || {}).co2).filter(v => v != null);
        const tempVals = lecturas.map(l => (l.valores instanceof Map ? Object.fromEntries(l.valores) : l.valores || {}).temperatura).filter(v => v != null);
        promedioPM25 = pm25Vals.length ? (pm25Vals.reduce((a, b) => a + b, 0) / pm25Vals.length).toFixed(2) : null;
        promedioCO2 = co2Vals.length ? Math.round(co2Vals.reduce((a, b) => a + b, 0) / co2Vals.length) : null;
        promedioTemp = tempVals.length ? (tempVals.reduce((a, b) => a + b, 0) / tempVals.length).toFixed(1) : null;
      }
      return {
        ...zona,
        estadisticas: { promedioAQI, maxAQI, promedioPM25, promedioCO2, promedioTemp }
      };
    }));

    res.json(zonasConStats);
  } catch (err) {
    console.error('Error al listar zonas públicas:', err);
    res.status(500).json({ error: 'Error al obtener zonas públicas' });
  }
}

async function crearZona(req, res) {
  try {
    const { nombre, descripcion, limitesAQI, esPublica } = req.body;
    const empresaId = req.user.empresaId || req.user.empresa;

    if (!empresaId && req.user.rol !== 'superadmin') {
      return res.status(403).json({ error: 'Usuario no asociado a una empresa' });
    }

    const empId = empresaId || req.body.empresaId;
    if (!empId) {
      return res.status(400).json({ error: 'empresaId es requerido' });
    }

    const existente = await Zona.findOne({ nombre, empresaId: empId });
    if (existente) {
      return res.status(400).json({ error: 'Ya existe una zona con ese nombre en la empresa' });
    }

    const zona = new Zona({
      nombre,
      empresaId: empId,
      descripcion: descripcion || '',
      limitesAQI: limitesAQI || {},
      esPublica: esPublica || false
    });
    await zona.save();
    res.status(201).json(zona);
  } catch (err) {
    console.error('Error al crear zona:', err);
    res.status(500).json({ error: 'Error al crear zona' });
  }
}

async function editarZona(req, res) {
  try {
    const { id } = req.params;
    const { nombre, descripcion, limitesAQI, esPublica } = req.body;

    const zona = await Zona.findById(id);
    if (!zona) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }

    if (req.user.rol !== 'superadmin') {
      const empresaId = req.user.empresaId || req.user.empresa;
      if (zona.empresaId.toString() !== empresaId.toString()) {
        return res.status(403).json({ error: 'No tienes permiso para editar esta zona' });
      }
    }

    if (nombre) zona.nombre = nombre;
    if (descripcion !== undefined) zona.descripcion = descripcion;
    if (limitesAQI) zona.limitesAQI = { ...zona.limitesAQI, ...limitesAQI };
    if (esPublica !== undefined) zona.esPublica = esPublica;

    await zona.save();
    res.json(zona);
  } catch (err) {
    console.error('Error al editar zona:', err);
    res.status(500).json({ error: 'Error al editar zona' });
  }
}

async function eliminarZona(req, res) {
  try {
    const { id } = req.params;

    const zona = await Zona.findById(id);
    if (!zona) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }

    if (req.user.rol !== 'superadmin') {
      const empresaId = req.user.empresaId || req.user.empresa;
      if (zona.empresaId.toString() !== empresaId.toString()) {
        return res.status(403).json({ error: 'No tienes permiso para eliminar esta zona' });
      }
    }

    await Dispositivo.updateMany(
      { zonaId: id },
      { $unset: { zonaId: 1 } }
    );
    await Lectura.updateMany(
      { zonaId: id },
      { $unset: { zonaId: 1 } }
    );
    await Zona.findByIdAndDelete(id);

    res.json({ mensaje: 'Zona eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar zona:', err);
    res.status(500).json({ error: 'Error al eliminar zona' });
  }
}

module.exports = {
  listarZonas,
  listarZonasPublicas,
  crearZona,
  editarZona,
  eliminarZona
};
