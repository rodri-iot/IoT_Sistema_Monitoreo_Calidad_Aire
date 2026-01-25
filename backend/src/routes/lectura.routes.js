
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { obtenerUltimas, obtenerDesdeFecha, obtenerPorSensor } = require('../controllers/lectura.controller');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.get('/ultimas', obtenerUltimas);
router.get('/desde', obtenerDesdeFecha);
router.get('/sensor/:sensorId', obtenerPorSensor);

module.exports = router;
