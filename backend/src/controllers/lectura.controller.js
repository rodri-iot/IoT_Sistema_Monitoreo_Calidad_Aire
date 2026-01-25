
const Lectura = require('../db/Lectura');
const Dispositivo = require('../db/Dispositivo');

// Obtener las últimas N lecturas (filtradas por empresa del usuario)
async function obtenerUltimas(req, res) {
  try {
    const limite = parseInt(req.query.limite) || 10;
    
    // Construir filtro según el rol del usuario
    let filter = {};
    
    if (req.user && req.user.rol !== 'superadmin') {
      // Si no es superadmin, filtrar por empresa del usuario
      filter.empresaId = req.user.empresaId || req.user.empresa;
    }
    
    // Filtro opcional por sensorId
    if (req.query.sensorId) {
      filter.sensorId = req.query.sensorId;
    }
    
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
    
    // Construir filtro según el rol del usuario
    let filter = { timestamp: { $gte: desde } };
    
    if (req.user && req.user.rol !== 'superadmin') {
      filter.empresaId = req.user.empresaId || req.user.empresa;
    }
    
    if (req.query.sensorId) {
      filter.sensorId = req.query.sensorId;
    }
    
    const lecturas = await Lectura.find(filter)
      .sort({ timestamp: 1 })
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
    
    res.json(lecturasFormateadas);
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
      const dispositivo = await Dispositivo.findOne({ 
        sensorId, 
        empresa: req.user.empresaId || req.user.empresa 
      });
      
      if (!dispositivo) {
        return res.status(403).json({ error: 'No tienes acceso a este dispositivo' });
      }
      
      filter.empresaId = req.user.empresaId || req.user.empresa;
    }
    
    const lecturas = await Lectura.find(filter)
      .sort({ timestamp: -1 })
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
    
    res.json(lecturasFormateadas);
  } catch (err) {
    console.error('Error al obtener lecturas por sensor:', err);
    res.status(500).json({ error: 'Error al obtener lecturas por sensor' });
  }
}

module.exports = { obtenerUltimas, obtenerDesdeFecha, obtenerPorSensor };


// Son funciones que serán utilizadas por tu archivo
// lectura.routes.js para responder a peticiones GET
// | Función             | Qué hace                                                                |
// | `obtenerUltimas`    | Devuelve las últimas N lecturas ordenadas de más reciente a más antigua |
// | `obtenerDesdeFecha` | Devuelve lecturas a partir de una fecha dada, en orden cronológico      |
