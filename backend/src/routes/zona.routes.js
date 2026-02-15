const express = require('express');
const router = express.Router();
const { authMiddleware, requireRoles } = require('../middleware/authMiddleware');
const {
  listarZonas,
  listarZonasPublicas,
  crearZona,
  editarZona,
  eliminarZona
} = require('../controllers/zona.controller');

router.get('/publicas', listarZonasPublicas);

router.use(authMiddleware);

router.get('/', listarZonas);
router.post('/', requireRoles(['admin', 'superadmin']), crearZona);
router.put('/:id', requireRoles(['admin', 'superadmin']), editarZona);
router.delete('/:id', requireRoles(['admin', 'superadmin']), eliminarZona);

module.exports = router;
