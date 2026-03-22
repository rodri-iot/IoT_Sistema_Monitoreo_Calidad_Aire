const Zona = require('../db/Zona');
const Dispositivo = require('../db/Dispositivo');
const Lectura = require('../db/Lectura');
const Empresa = require('../db/Empresa');
const mongoose = require('mongoose');

function buildBucketTruncExpr(agrupacionVal, timezone) {
  const tz = timezone || 'America/Argentina/Buenos_Aires';
  const base = { date: '$timestamp', timezone: tz };
  switch (agrupacionVal) {
    case 'minuto':
      return { $dateTrunc: { ...base, unit: 'minute', binSize: 1 } };
    case '5min':
    case 'cincomin':
      return { $dateTrunc: { ...base, unit: 'minute', binSize: 5 } };
    case '10min':
      return { $dateTrunc: { ...base, unit: 'minute', binSize: 10 } };
    case '30min':
      return { $dateTrunc: { ...base, unit: 'minute', binSize: 30 } };
    case '4h':
      return { $dateTrunc: { ...base, unit: 'hour', binSize: 4 } };
    case '8h':
      return { $dateTrunc: { ...base, unit: 'hour', binSize: 8 } };
    case 'dia':
      return { $dateTrunc: { ...base, unit: 'day', binSize: 1 } };
    default:
      return { $dateTrunc: { ...base, unit: 'hour', binSize: 1 } };
  }
}

/**
 * Ventana [desde, hasta] siempre cerrada para consultas públicas.
 * Evita filtros solo con $gte o solo $lte que devuelven histórico completo.
 */
function resolveTimestampWindow(desde, hasta) {
  const now = new Date();
  let desdeDt;
  let hastaDt;
  if (desde && hasta) {
    desdeDt = new Date(desde);
    hastaDt = new Date(hasta);
    if (Number.isNaN(desdeDt.getTime()) || Number.isNaN(hastaDt.getTime())) {
      hastaDt = now;
      desdeDt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  } else {
    hastaDt = now;
    desdeDt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  if (hastaDt < desdeDt) {
    const t = desdeDt;
    desdeDt = hastaDt;
    hastaDt = t;
  }
  return { desdeDt, hastaDt };
}

/** IDs de zonas públicas (cache-friendly helper). */
async function getZonasPublicasIds() {
  const zonas = await Zona.find({ esPublica: true }).select('_id empresaId nombre').lean();
  return zonas;
}

/** Validar que un sensorId pertenezca a dispositivo público en zona pública. */
async function validarSensorPublico(sensorId) {
  const dispositivo = await Dispositivo.findOne({ sensorId, esPublico: true }).lean();
  if (!dispositivo) return null;
  const zona = dispositivo.zonaId
    ? await Zona.findOne({ _id: dispositivo.zonaId, esPublica: true }).lean()
    : await Zona.findOne({ nombre: dispositivo.zona, empresaId: dispositivo.empresa, esPublica: true }).lean();
  if (!zona) return null;
  return dispositivo;
}

async function listarEmpresas(req, res) {
  try {
    const zonasPublicas = await getZonasPublicasIds();
    if (zonasPublicas.length === 0) return res.json([]);

    const zonaIds = zonasPublicas.map(z => z._id);
    const empresaIds = [...new Set(zonasPublicas.map(z => String(z.empresaId)))];

    const dispositivos = await Dispositivo.find({
      esPublico: true,
      $or: [
        { zonaId: { $in: zonaIds } },
        ...zonasPublicas.map(z => ({ zona: z.nombre, empresa: z.empresaId }))
      ]
    }).select('sensorId empresa zonaId zona').lean();

    const desde = new Date();
    desde.setHours(desde.getHours() - 24);

    const resultado = await Promise.all(empresaIds.map(async (empId) => {
      const empresa = await Empresa.findById(empId).select('nombre').lean();
      if (!empresa) return null;
      const dispsEmpresa = dispositivos.filter(d => String(d.empresa) === empId);
      if (dispsEmpresa.length === 0) return null;

      const sensorIds = dispsEmpresa.map(d => d.sensorId);
      const ultimaLectura = await Lectura.findOne({
        sensorId: { $in: sensorIds },
        timestamp: { $gte: desde },
        aqi: { $ne: null }
      }).sort({ aqi: -1 }).select('aqi').lean();

      return {
        _id: empresa._id,
        nombre: empresa.nombre,
        maxAQI: ultimaLectura?.aqi ?? null,
        totalDispositivos: dispsEmpresa.length
      };
    }));

    res.json(resultado.filter(Boolean).sort((a, b) => (b.maxAQI || 0) - (a.maxAQI || 0)));
  } catch (err) {
    console.error('Error en publico/empresas:', err);
    res.status(500).json({ error: 'Error al obtener empresas públicas' });
  }
}

async function listarDispositivos(req, res) {
  try {
    const { empresaId } = req.query;
    if (!empresaId) return res.status(400).json({ error: 'empresaId requerido' });

    const zonasPublicas = await Zona.find({ esPublica: true, empresaId }).select('_id nombre').lean();
    if (zonasPublicas.length === 0) return res.json([]);

    const zonaIds = zonasPublicas.map(z => z._id);
    const zonaNombres = zonasPublicas.map(z => z.nombre);

    const dispositivos = await Dispositivo.find({
      esPublico: true,
      empresa: new mongoose.Types.ObjectId(empresaId),
      $or: [
        { zonaId: { $in: zonaIds } },
        { zona: { $in: zonaNombres } }
      ]
    }).select('sensorId nombre zona zonaId ultimaLectura estado').lean();

    const resultado = await Promise.all(dispositivos.map(async (d) => {
      const ultimaLect = await Lectura.findOne({ sensorId: d.sensorId, aqi: { $ne: null } })
        .sort({ timestamp: -1 })
        .select('aqi aqiParametro timestamp')
        .lean();
      return {
        _id: d._id,
        sensorId: d.sensorId,
        nombre: d.nombre,
        zona: d.zona,
        zonaId: d.zonaId,
        ultimaLectura: d.ultimaLectura,
        estado: d.estado,
        aqi: ultimaLect?.aqi ?? null,
        aqiParametro: ultimaLect?.aqiParametro ?? null,
        ultimoTimestamp: ultimaLect?.timestamp ?? null
      };
    }));

    res.json(resultado.sort((a, b) => (b.aqi || 0) - (a.aqi || 0)));
  } catch (err) {
    console.error('Error en publico/dispositivos:', err);
    res.status(500).json({ error: 'Error al obtener dispositivos públicos' });
  }
}

async function obtenerAgregadas(req, res) {
  try {
    const { sensorId, desde, hasta, agrupacion } = req.query;
    if (!sensorId) return res.status(400).json({ error: 'sensorId requerido' });

    const dispositivo = await validarSensorPublico(sensorId);
    if (!dispositivo) return res.status(404).json({ error: 'Sensor no encontrado o no es público' });

    const agrupacionVal = agrupacion || '5min';
    const appTz = process.env.APP_TIMEZONE || 'America/Argentina/Buenos_Aires';
    const bucketExpr = buildBucketTruncExpr(agrupacionVal, appTz);

    const { desdeDt, hastaDt } = resolveTimestampWindow(desde, hasta);
    const filter = { sensorId, timestamp: { $gte: desdeDt, $lte: hastaDt } };

    const pipeline = [
      { $match: filter },
      { $addFields: { bucket: bucketExpr } },
      {
        $group: {
          _id: '$bucket',
          avgAqi: { $avg: '$aqi' },
          maxAqi: { $max: '$aqi' },
          minAqi: { $min: '$aqi' },
          avgPm25: { $avg: '$valores.pm25' },
          avgPm10: { $avg: '$valores.pm10' },
          avgNo2: { $avg: '$valores.no2' },
          avgCo: { $avg: '$valores.co' },
          avgNh3: { $avg: '$valores.nh3' },
          avgCo2: { $avg: '$valores.co2' },
          avgTvoc: { $avg: '$valores.tvoc' },
          avgTemp: { $avg: '$valores.temperatura' },
          avgHumedad: { $avg: '$valores.humedad' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const resultados = await Lectura.aggregate(pipeline);
    res.json(resultados);
  } catch (err) {
    console.error('Error en publico/agregadas:', err);
    res.status(500).json({ error: 'Error al obtener datos agregados públicos' });
  }
}

async function obtenerLecturas(req, res) {
  try {
    const { sensorId, desde, hasta } = req.query;
    const limite = Math.min(parseInt(req.query.limite) || 20, 500);
    const skip = parseInt(req.query.skip) || 0;
    if (!sensorId) return res.status(400).json({ error: 'sensorId requerido' });

    const dispositivo = await validarSensorPublico(sensorId);
    if (!dispositivo) return res.status(404).json({ error: 'Sensor no encontrado o no es público' });

    const { desdeDt, hastaDt } = resolveTimestampWindow(desde, hasta);
    const filter = { sensorId, timestamp: { $gte: desdeDt, $lte: hastaDt } };

    const [lecturas, total] = await Promise.all([
      Lectura.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limite).lean(),
      Lectura.countDocuments(filter)
    ]);

    res.json({ lecturas, total });
  } catch (err) {
    console.error('Error en publico/lecturas:', err);
    res.status(500).json({ error: 'Error al obtener lecturas públicas' });
  }
}

module.exports = { listarEmpresas, listarDispositivos, obtenerAgregadas, obtenerLecturas };
