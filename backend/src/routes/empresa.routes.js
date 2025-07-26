const express = require('express')
const router = express.Router()
const { crearEmpresa } = require('../controllers/empresa.controller')
const auth = require('../middleware/authMiddleware')

router.post('/empresas', auth, crearEmpresa)

module.exports = router