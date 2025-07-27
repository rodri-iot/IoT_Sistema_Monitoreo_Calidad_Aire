const express = require('express')
const router = express.Router()
const { crearEmpresa } = require('../controllers/empresa.controller')
const { authMiddleware, requireRole } = require('../middleware/authMiddleware')
const { listarEmpresas } = require('../controllers/empresa.controller')

router.post('/', authMiddleware, requireRole('superadmin'), crearEmpresa)
router.get('/admin/empresas', authMiddleware, requireRole('superadmin'), listarEmpresas)

module.exports = router