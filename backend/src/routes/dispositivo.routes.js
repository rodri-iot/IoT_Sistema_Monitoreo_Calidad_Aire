const express = require('express')
const router = express.Router()
const { authMiddleware, requireRoles } = require('../middleware/authMiddleware')
const {
  crearDispositivo,
  listarDispositivos,
  editarDispositivo,
  eliminarDispositivo
} = require('../controllers/dispositivo.controller')

router.use(authMiddleware)

router.get('/', listarDispositivos)
router.post('/', requireRoles(['admin', 'superadmin']), crearDispositivo)
router.put('/:id', requireRoles(['admin', 'superadmin']), editarDispositivo)
router.delete('/:id', requireRoles(['admin', 'superadmin']), eliminarDispositivo)

module.exports = router