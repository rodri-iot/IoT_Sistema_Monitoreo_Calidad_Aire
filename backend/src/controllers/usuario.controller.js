const Usuario = require('../db/Usuario')
const Empresa = require('../db/Empresa')
const bcrypt = require('bcrypt')

const getPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user.id).populate('empresa', 'nombre')
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

    res.json({
      correo: usuario.correo,
      rol: usuario.rol,
      empresa: usuario.empresa?.nombre
    })
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el perfil' })
  }
}

const eliminarUsuario = async (req, res) => {
  try {
    const userId = req.params.id

    const usuario = await Usuario.findByIdAndDelete(userId)
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // Quitar el usuario del array de usuarios de su empresa
    await Empresa.findByIdAndUpdate(usuario.empresa, {
      $pull: { usuarios: usuario._id }
    })

    res.json({ mensaje: 'Usuario eliminado correctamente' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar usuario' })
  }
}

// PUT /api/usuarios/:id
const editarUsuario = async (req, res) => {
  console.log('[PUT usuario] Datos recibidos:', req.body)
  try {
    const userId = req.params.id
    const { correo, rol, password } = req.body

    if (!correo || !rol) {
      return res.status(400).json({ error: 'Faltan datos para actualizar' })
    }

    const usuario = await Usuario.findById(userId)
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })

    usuario.correo = correo
    usuario.rol = rol

    if (password && password.trim() !== '') {
      const hashed = await bcrypt.hash(password, 10)
      usuario.password = hashed
    }

    await usuario.save()

    res.json({ 
      mensaje: 'Usuario actualizado',
      usuario: {
        _id: usuario._id,
        correo: usuario.correo,
        rol: usuario.rol
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al editar usuario' })
  }
}

module.exports = {
  getPerfil,
  eliminarUsuario,
  editarUsuario
}