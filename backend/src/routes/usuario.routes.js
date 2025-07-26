const express = require('express')
const router = express.Router()
const { getPerfil } = require('../controllers/usuario.controller')
const auth = require('../middleware/authMiddleware')
const { auth, req } = require('../middleware/authMiddleware')

router.get('/usuarios/me', auth, getPerfil)

module.exports = router