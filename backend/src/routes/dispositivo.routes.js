const express = require('express')
const router = express.Router()
const { authMiddleware, requireRole } = require('../middleware/authMiddleware')
const {
  crearDispositivo,
  listarDispositivos,
  editarDispositivo,
  eliminarDispositivo
} = require('../controllers/dispositivo.controller')

router.use(authMiddleware)

router.get('/', listarDispositivos)
router.post('/', requireRole('admin'), crearDispositivo)
router.put('/:id', requireRole('admin'), editarDispositivo)
router.delete('/:id', requireRole('admin'), eliminarDispositivo)

module.exports = router