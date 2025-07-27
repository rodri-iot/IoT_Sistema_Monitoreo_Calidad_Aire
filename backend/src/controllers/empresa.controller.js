const Empresa = require('../db/Empresa')
const Usuario = require('../db/Usuario')
const bcrypt = require('bcrypt')

const crearEmpresa = async (req, res) => {
  const { empresa, usuario } = req.body

  if (!usuario.correo) {
    return res.status(400).json({ error: 'El correo es obligatorio' })
  }

  try {
    const existeUsuario = await Usuario.findOne({ correo: usuario.correo })
    if (existeUsuario) {
      return res.status(409).json({ error: 'Ese correo ya esta registrado' })
    }
    let empresaExistente = await Empresa.findOne({ nombre: empresa })
    if (!empresaExistente) {
      empresaExistente = new Empresa({ nombre: empresa })
      await empresaExistente.save()
    }
    
    const hashedPassword = await bcrypt.hash(usuario.password, 10)

    const nuevoUsuario = new Usuario({
      correo: usuario.correo,
      password: hashedPassword,
      rol: usuario.rol || 'admin',
      empresa: empresaExistente._id
    })

    await nuevoUsuario.save()

    empresaExistente.usuarios.push(nuevoUsuario._id)
    await empresaExistente.save()

    res.status(201).json({ mensaje: 'Empresa y usuario creados', empresa: empresaExistente.nombre })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear empresa' })
  }
}

const listarEmpresas = async (req, res) => {
  try {
    const empresas = await Empresa.find()
      .populate({
        path: 'usuarios',
        select: 'correo rol'
      })

    res.json(empresas)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener empresas' })
  }
}

module.exports = {
  crearEmpresa,
  listarEmpresas
}