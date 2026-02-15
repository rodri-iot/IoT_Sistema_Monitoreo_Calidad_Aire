const express = require('express')
const router = express.Router()
const {
    listarUsuarios,
    crearUsuario,
    getPerfil,
    eliminarUsuario,
    editarUsuario
 } = require('../controllers/usuario.controller')

const { authMiddleware, requireRole, requireRoles } = require('../middleware/authMiddleware')

router.get('/usuarios', authMiddleware, requireRoles(['admin', 'superadmin']), listarUsuarios)
router.post('/usuarios', authMiddleware, requireRoles(['admin', 'superadmin']), crearUsuario)
router.get('/usuarios/me', authMiddleware, getPerfil)
router.delete('/usuarios/:id', authMiddleware, requireRoles(['admin', 'superadmin']), eliminarUsuario)
router.put('/usuarios/:id', authMiddleware, requireRoles(['admin', 'superadmin']), editarUsuario)

module.exports = router