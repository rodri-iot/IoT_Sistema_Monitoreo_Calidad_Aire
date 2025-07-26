const Usuario = require('../db/Usuario')

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

module.exports = { getPerfil }