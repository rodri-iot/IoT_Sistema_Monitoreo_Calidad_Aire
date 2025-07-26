const Empresa = require('../db/Empresa')
const Usuario = require('../db/Usuario')
const bcrypt = require('bcrypt')

const crearEmpresa = async (req, res) => {
  const { empresa, usuario } = req.body
  try {
    const nuevaEmpresa = new Empresa({ nombre: empresa })
    await nuevaEmpresa.save()

    const hashedPassword = await bcrypt.hash(usuario.password, 10)

    const nuevoUsuario = new Usuario({
      correo: usuario.correo,
      password: hashedPassword,
      rol: usuario.rol || 'admin',
      empresa: nuevaEmpresa._id
    })

    await nuevoUsuario.save()

    nuevaEmpresa.usuarios.push(nuevoUsuario._id)
    await nuevaEmpresa.save()

    res.status(201).json({ mensaje: 'Empresa y usuario creados', empresa: nuevaEmpresa.nombre })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear empresa' })
  }
}

module.exports = { crearEmpresa }