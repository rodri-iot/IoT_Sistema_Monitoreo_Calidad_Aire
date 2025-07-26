
const express = require('express');
const router = express.Router();
const { obtenerUltimas, obtenerDesdeFecha } = require('../controllers/lectura.controller');

router.get('/ultimas', obtenerUltimas);
router.get('/desde', obtenerDesdeFecha);

module.exports = router;
