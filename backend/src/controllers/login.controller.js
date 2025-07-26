const Usuario = require('../db/Usuario')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const login = async (req, res) => {
  const { correo, password } = req.body
  console.log('📥 Login recibido:', req.body)
  try {
    const usuario = await Usuario.findOne({ correo }).populate('empresa')
    if (!usuario) return res.status(401).json({ error: 'Usuario no encontrado' })

    const valid = await bcrypt.compare(password, usuario.password)
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' })

    const token = jwt.sign(
      {
        id: usuario._id,
        correo: usuario.correo,
        rol: usuario.rol,
        empresaId: usuario.empresa?._id
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({ token, usuario: { correo: usuario.correo, rol: usuario.rol, empresa: usuario.empresa?.nombre } })
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
}

module.exports = { login }