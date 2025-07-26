
const Lectura = require('../db/Lectura');

// Obtener las últimas N lecturas
async function obtenerUltimas(req, res) {
  try {
    const limite = parseInt(req.query.limite) || 10;
    const lecturas = await Lectura.find().sort({ timestamp: -1 }).limit(limite);
    res.json(lecturas);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener lecturas' });
  }
}

// Obtener lecturas desde una fecha
async function obtenerDesdeFecha(req, res) {
  try {
    const desde = new Date(req.query.fecha);
    const lecturas = await Lectura.find({ timestamp: { $gte: desde } }).sort({ timestamp: 1 });
    res.json(lecturas);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener lecturas por fecha' });
  }
}

module.exports = { obtenerUltimas, obtenerDesdeFecha };


// Son funciones que serán utilizadas por tu archivo
// lectura.routes.js para responder a peticiones GET
// | Función             | Qué hace                                                                |
// | `obtenerUltimas`    | Devuelve las últimas N lecturas ordenadas de más reciente a más antigua |
// | `obtenerDesdeFecha` | Devuelve lecturas a partir de una fecha dada, en orden cronológico      |
