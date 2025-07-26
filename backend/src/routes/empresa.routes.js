const express = require('express')
const router = express.Router()
const { crearEmpresa } = require('../controllers/empresa.controller')
const { authMiddleware, requireRole } = require('../middleware/authMiddleware')

router.post('/', authMiddleware, requireRole('superadmin'), crearEmpresa)


module.exports = router