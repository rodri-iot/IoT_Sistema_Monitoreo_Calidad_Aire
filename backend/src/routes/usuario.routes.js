const express = require('express')
const router = express.Router()
const { 
    getPerfil,
    eliminarUsuario,
    editarUsuario
 } = require('../controllers/usuario.controller')

const { authMiddleware, requireRole } = require('../middleware/authMiddleware')

router.get('/usuarios/me', authMiddleware, getPerfil)
router.delete('/usuarios/:id', authMiddleware, requireRole('superadmin'), eliminarUsuario)
router.put('/usuarios/:id', authMiddleware, requireRole('superadmin'), editarUsuario)

module.exports = router