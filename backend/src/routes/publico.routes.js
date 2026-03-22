const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/publico.controller');

router.get('/empresas', ctrl.listarEmpresas);
router.get('/dispositivos', ctrl.listarDispositivos);
router.get('/agregadas', ctrl.obtenerAgregadas);
router.get('/lecturas', ctrl.obtenerLecturas);

module.exports = router;
