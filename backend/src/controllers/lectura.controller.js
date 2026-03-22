const Lectura = require('../db/Lectura');
const Dispositivo = require('../db/Dispositivo');
const Empresa = require('../db/Empresa');
const mongoose = require('mongoose');

function esObjectIdValido(val) {
  if (!val) return false;
  const str = String(val);
  return /^[a-f0-9]{24}$/i.test(str);
}

async function resolverEmpresaId(val) {
  if (!val) return null;
  if (esObjectIdValido(val)) return val;
  const emp = await Empresa.findOne({ nombre: String(val).trim() });
  return emp ? emp._id : null;
}

/**
 * Expresión $dateTrunc para agrupar lecturas en la zona IANA del negocio (APP_TIMEZONE).
 * Semana: inicio según MongoDB en esa zona (típicamente lunes ISO).
 */
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
    case 'semana':
      return { $dateTrunc: { ...base, unit: 'week', binSize: 1 } };
    case 'mes':
      return { $dateTrunc: { ...base, unit: 'month', binSize: 1 } };
    case 'año':
    case 'anio':
      return { $dateTrunc: { ...base, unit: 'year', binSize: 1 } };
    default:
      return { $dateTrunc: { ...base, unit: 'hour', binSize: 1 } };
  }
}

// Obtener las últimas N lecturas (filtradas por empresa del usuario)
async function obtenerUltimas(req, res) {
  try {
    const limite = parseInt(req.query.limite) || 10;
    
    // Construir filtro según el rol del usuario
    let filter = {};
    
    if (req.user && req.user.rol !== 'superadmin') {
      const empId = await resolverEmpresaId(req.user.empresaId || req.user.empresa);
      filter.empresaId = empId ? new mongoose.Types.ObjectId(empId) : new mongoose.Types.ObjectId();
    }
    
    if (req.query.sensorId) filter.sensorId = req.query.sensorId;
    if (req.query.zonaId) {
      const Zona = require('../db/Zona');
      const zona = await Zona.findById(req.query.zonaId).lean();
      const orConditions = [{ zonaId: new mongoose.Types.ObjectId(req.query.zonaId) }];
      if (zona?.nombre) orConditions.push({ zona: (zona.nombre || '').trim() });
      filter.$or = orConditions;
    }
    if (req.query.zonaNombre && !req.query.zonaId) filter.zona = req.query.zonaNombre;
    
    const lecturas = await Lectura.find(filter)
      .sort({ timestamp: -1 })
      .limit(limite)
      .populate('dispositivoId', 'nombre ubicacion')
      .lean(); // Usar lean() para mejor performance
    
    // Convertir Map a objeto para JSON (si es necesario)
    // Con .lean(), Mongoose ya convierte Maps a objetos, pero verificamos por si acaso
    const lecturasFormateadas = lecturas.map(lectura => {
      let valores = lectura.valores;
      
      // Si valores es un Map, convertirlo a objeto
      if (valores instanceof Map) {
        valores = Object.fromEntries(valores);
      } else if (!valores || typeof valores !== 'object') {
        // Si no existe o no es un objeto, usar objeto vacío
        valores = {};
      }
      // Si ya es un objeto, usarlo directamente
      
      return {
        ...lectura,
        valores: valores
      };
    });
    
    res.json(lecturasFormateadas);
  } catch (err) {
    console.error('Error al obtener lecturas:', err);
    res.status(500).json({ error: 'Error al obtener lecturas' });
  }
}

// Obtener lecturas desde una fecha
async function obtenerDesdeFecha(req, res) {
  try {
    const desde = new Date(req.query.fecha);
    const limite = parseInt(req.query.limite) || 500;
    
    let filter = { timestamp: { $gte: desde } };
    if (req.query.hasta) {
      filter.timestamp.$lte = new Date(req.query.hasta);
    }
    
    if (req.user && req.user.rol !== 'superadmin') {
      const empId = await resolverEmpresaId(req.user.empresaId || req.user.empresa);
      if (empId) filter.empresaId = new mongoose.Types.ObjectId(empId);
    }
    
    if (req.query.sensorId) filter.sensorId = req.query.sensorId;
    if (req.query.zonaId) {
      const Zona = require('../db/Zona');
      const zona = await Zona.findById(req.query.zonaId).lean();
      const orConditions = [{ zonaId: new mongoose.Types.ObjectId(req.query.zonaId) }];
      if (zona?.nombre) orConditions.push({ zona: (zona.nombre || '').trim() });
      filter.$or = orConditions;
    }
    if (req.query.zonaNombre && !req.query.zonaId) filter.zona = req.query.zonaNombre;
    
    const skip = parseInt(req.query.skip, 10) || 0;
    const total = await Lectura.countDocuments(filter);
    
    const lecturas = await Lectura.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limite)
      .populate('dispositivoId', 'nombre ubicacion')
      .lean();
    
    // Convertir Map a objeto para JSON (si es necesario)
    // Con .lean(), Mongoose ya convierte Maps a objetos, pero verificamos por si acaso
    const lecturasFormateadas = lecturas.map(lectura => {
      let valores = lectura.valores;
      
      // Si valores es un Map, convertirlo a objeto
      if (valores instanceof Map) {
        valores = Object.fromEntries(valores);
      } else if (!valores || typeof valores !== 'object') {
        // Si no existe o no es un objeto, usar objeto vacío
        valores = {};
      }
      // Si ya es un objeto, usarlo directamente
      
      return {
        ...lectura,
        valores: valores
      };
    });
    
    res.json({ lecturas: lecturasFormateadas, total });
  } catch (err) {
    console.error('Error al obtener lecturas por fecha:', err);
    res.status(500).json({ error: 'Error al obtener lecturas por fecha' });
  }
}

// Obtener lecturas por sensorId
async function obtenerPorSensor(req, res) {
  try {
    const { sensorId } = req.params;
    const limite = parseInt(req.query.limite) || 100;
    
    let filter = { sensorId };
    
    // Validar que el sensor pertenezca a la empresa del usuario (si no es superadmin)
    if (req.user && req.user.rol !== 'superadmin') {
      const empId = await resolverEmpresaId(req.user.empresaId || req.user.empresa);
      const dispositivo = await Dispositivo.findOne({ 
        sensorId, 
        empresa: empId 
      });
      
      if (!dispositivo) {
        return res.status(403).json({ error: 'No tienes acceso a este dispositivo' });
      }
      if (empId) filter.empresaId = new mongoose.Types.ObjectId(empId);
    }
    
    const skip = parseInt(req.query.skip, 10) || 0;
    const total = await Lectura.countDocuments(filter);
    
    const lecturas = await Lectura.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limite)
      .lean();
    
    // Convertir Map a objeto para JSON (si es necesario)
    const lecturasFormateadas = lecturas.map(lectura => {
      let valores = lectura.valores;
      
      // Si valores es un Map, convertirlo a objeto
      if (valores instanceof Map) {
        valores = Object.fromEntries(valores);
      } else if (!valores || typeof valores !== 'object') {
        // Si no existe o no es un objeto, usar objeto vacío
        valores = {};
      }
      // Si ya es un objeto, usarlo directamente
      
      return {
        ...lectura,
        valores: valores
      };
    });
    
    res.json({ lecturas: lecturasFormateadas, total });
  } catch (err) {
    console.error('Error al obtener lecturas por sensor:', err);
    res.status(500).json({ error: 'Error al obtener lecturas por sensor' });
  }
}

async function obtenerAgregadas(req, res) {
  try {
    const { zonaId, zonaNombre, dispositivoId, sensorId, desde, hasta, agrupacion, operacion } = req.query;
    const agrupacionVal = agrupacion || 'hora';
    const operacionVal = (operacion === 'max') ? 'max' : 'avg';

    let filter = {};
    if (req.user && req.user.rol !== 'superadmin') {
      const empId = await resolverEmpresaId(req.user.empresaId || req.user.empresa);
      filter.empresaId = empId ? new mongoose.Types.ObjectId(empId) : new mongoose.Types.ObjectId();
    }
    if (zonaId) {
      const Zona = require('../db/Zona');
      const zona = await Zona.findById(zonaId).lean();
      const orConditions = [{ zonaId: new mongoose.Types.ObjectId(zonaId) }];
      if (zona?.nombre) orConditions.push({ zona: (zona.nombre || '').trim() });
      filter.$or = orConditions;
    }
    if (zonaNombre && !zonaId) filter.zona = zonaNombre;
    if (dispositivoId) filter.dispositivoId = new mongoose.Types.ObjectId(dispositivoId);
    if (sensorId) filter.sensorId = sensorId;
    if (desde || hasta) {
      filter.timestamp = {};
      if (desde) filter.timestamp.$gte = new Date(desde);
      if (hasta) filter.timestamp.$lte = new Date(hasta);
    }

    const appTz = process.env.APP_TIMEZONE || 'America/Argentina/Buenos_Aires';
    const bucketExpr = buildBucketTruncExpr(agrupacionVal, appTz);

    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_AGREGADAS) {
      console.log('[agregadas] filter', JSON.stringify(filter));
    }

    let pipeline;
    if (operacionVal === 'max') {
      pipeline = [
        { $match: filter },
        { $addFields: { bucket: bucketExpr } },
        { $sort: { bucket: 1, aqi: -1 } },
        {
          $group: {
            _id: '$bucket',
            avgAqi: { $first: '$aqi' },
            maxAqi: { $first: '$aqi' },
            minAqi: { $first: '$aqi' },
            avgPm25: { $first: '$valores.pm25' },
            avgPm10: { $first: '$valores.pm10' },
            avgNo2: { $first: '$valores.no2' },
            avgCo: { $first: '$valores.co' },
            avgNh3: { $first: '$valores.nh3' },
            avgCo2: { $first: '$valores.co2' },
            avgTvoc: { $first: '$valores.tvoc' },
            avgTemp: { $first: '$valores.temperatura' },
            avgHumedad: { $first: '$valores.humedad' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ];
    } else {
      pipeline = [
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
    }

    const resultados = await Lectura.aggregate(pipeline);
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_AGREGADAS) {
      console.log('[agregadas] resultados.length', resultados.length);
    }
    res.json(resultados);
  } catch (err) {
    console.error('Error al obtener lecturas agregadas:', err);
    res.status(500).json({ error: 'Error al obtener lecturas agregadas' });
  }
}

async function picoDispositivos(req, res) {
  try {
    const horas = parseInt(req.query.horas, 10) || 4;
    const desde = new Date();
    desde.setHours(desde.getHours() - horas);

    const matchStage = { timestamp: { $gte: desde }, aqi: { $ne: null } };
    if (req.user && req.user.rol !== 'superadmin') {
      const empId = await resolverEmpresaId(req.user.empresaId || req.user.empresa);
      if (empId) matchStage.empresaId = new mongoose.Types.ObjectId(empId);
    }

    const pipeline = [
      { $match: matchStage },
      { $addFields: { sid: { $ifNull: ['$sensorId', { $toString: '$dispositivoId' }] } } },
      { $match: { sid: { $ne: null, $ne: '' } } },
      { $sort: { aqi: -1 } },
      {
        $group: {
          _id: '$sid',
          maxAQI: { $max: '$aqi' },
          minAQI: { $min: '$aqi' },
          avgAQI: { $avg: '$aqi' },
          pico: { $first: '$$ROOT' }
        }
      },
      { $sort: { maxAQI: -1 } }
    ];
    const grupos = await Lectura.aggregate(pipeline);

    const resultados = [];
    for (const g of grupos) {
      const pico = g.pico;
      const v = pico?.valores instanceof Map ? Object.fromEntries(pico.valores) : (pico?.valores || {});
      const disp = await Dispositivo.findOne({ sensorId: g._id }).select('nombre').lean();
      resultados.push({
        sensorId: g._id,
        dispositivoNombre: disp?.nombre || g._id,
        aqi: g.maxAQI,
        maxAQI: g.maxAQI,
        minAQI: g.minAQI,
        promedioAQI: g.avgAQI != null ? Math.round(g.avgAQI) : null,
        timestamp: pico?.timestamp,
        valores: {
          pm25: v.pm25,
          pm10: v.pm10,
          co2: v.co2,
          temperatura: v.temperatura ?? v.temp ?? v.temperature,
          humedad: v.humedad ?? v.humidity,
          no2: v.no2,
          co: v.co,
          tvoc: v.tvoc
        }
      });
    }
    res.json(resultados);
  } catch (err) {
    console.error('Error en pico-dispositivos:', err);
    res.status(500).json({ error: 'Error al obtener pico por dispositivo' });
  }
}

async function obtenerEstadisticasZona(req, res) {
  try {
    const { zonaId, horas } = req.query;
    const horasVal = parseInt(horas) || 12;

    const desde = new Date();
    desde.setHours(desde.getHours() - horasVal);

    let filter = { timestamp: { $gte: desde } };
    if (req.user && req.user.rol !== 'superadmin') {
      const empId = await resolverEmpresaId(req.user.empresaId || req.user.empresa);
      filter.empresaId = empId ? new mongoose.Types.ObjectId(empId) : new mongoose.Types.ObjectId();
    }
    if (zonaId) {
      const Zona = require('../db/Zona');
      const zona = await Zona.findById(zonaId).lean();
      const orConditions = [{ zonaId: new mongoose.Types.ObjectId(zonaId) }];
      if (zona?.nombre) orConditions.push({ zona: (zona.nombre || '').trim() });
      filter.$or = orConditions;
    }

    const lecturas = await Lectura.find(filter).lean();
    const porZona = {};
    lecturas.forEach(l => {
      const z = l.zona || 'Sin zona';
      if (!porZona[z]) porZona[z] = { aqi: [], pm25: [], pm10: [], co2: [], temp: [], humedad: [] };
      if (l.aqi != null) porZona[z].aqi.push(l.aqi);
      const v = l.valores instanceof Map ? Object.fromEntries(l.valores) : (l.valores || {});
      if (v.pm25 != null) porZona[z].pm25.push(v.pm25);
      if (v.pm10 != null) porZona[z].pm10.push(v.pm10);
      if (v.co2 != null) porZona[z].co2.push(v.co2);
      if (v.temperatura != null) porZona[z].temp.push(v.temperatura);
      if (v.humedad != null) porZona[z].humedad.push(v.humedad);
    });

    const stats = {};
    Object.keys(porZona).forEach(z => {
      const d = porZona[z];
      const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;
      const max = (arr) => arr.length ? Math.max(...arr) : null;
      stats[z] = {
        promedioAQI: avg(d.aqi),
        maxAQI: max(d.aqi),
        promedioPM25: avg(d.pm25),
        promedioPM10: avg(d.pm10),
        promedioCO2: avg(d.co2),
        promedioTemp: avg(d.temp),
        promedioHumedad: avg(d.humedad),
        totalLecturas: d.aqi.length
      };
    });

    res.json(stats);
  } catch (err) {
    console.error('Error al obtener estadísticas:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas de zona' });
  }
}

module.exports = {
  obtenerUltimas,
  obtenerDesdeFecha,
  obtenerPorSensor,
  obtenerAgregadas,
  obtenerEstadisticasZona,
  picoDispositivos
};


// Son funciones que serán utilizadas por tu archivo
// lectura.routes.js para responder a peticiones GET
// | Función             | Qué hace                                                                |
// | `obtenerUltimas`    | Devuelve las últimas N lecturas ordenadas de más reciente a más antigua |
// | `obtenerDesdeFecha` | Devuelve lecturas a partir de una fecha dada, en orden cronológico      |
