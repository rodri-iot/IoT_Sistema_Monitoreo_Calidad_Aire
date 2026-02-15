const Usuario = require('../db/Usuario')
const Empresa = require('../db/Empresa')
const bcrypt = require('bcrypt')

function esObjectIdValido(val) {
  if (!val) return false
  const str = String(val)
  return /^[a-f0-9]{24}$/i.test(str)
}

const listarUsuarios = async (req, res) => {
  try {
    let filter = {}
    if (req.user.rol === 'superadmin') {
      if (req.query.empresaId) filter.empresa = req.query.empresaId
    } else {
      const empresaId = req.user.empresaId || req.user.empresa
      if (!empresaId) return res.status(403).json({ error: 'Usuario no asociado a una empresa' })
      filter.empresa = empresaId
    }
    const usuarios = await Usuario.find(filter)
      .select('-password')
      .populate('empresa', 'nombre')
      .lean()
    res.json(usuarios)
  } catch (err) {
    console.error('Error al listar usuarios:', err)
    res.status(500).json({ error: 'Error al listar usuarios' })
  }
}

const crearUsuario = async (req, res) => {
  try {
    const { correo, password, rol, empresaId } = req.body
    if (!correo || !password || !rol) {
      return res.status(400).json({ error: 'correo, password y rol son requeridos' })
    }
    let empresaIdFinal = empresaId || req.user.empresaId || req.user.empresa
    if (empresaIdFinal && !esObjectIdValido(empresaIdFinal)) {
      const emp = await Empresa.findOne({ nombre: String(empresaIdFinal).trim() })
      if (emp) empresaIdFinal = emp._id
      else empresaIdFinal = req.user.empresaId
    }
    if (!empresaIdFinal && req.user.rol !== 'superadmin') {
      return res.status(403).json({ error: 'Usuario no asociado a una empresa' })
    }
    const existente = await Usuario.findOne({ correo })
    if (existente) return res.status(400).json({ error: 'Ya existe un usuario con ese correo' })
    const hashed = await bcrypt.hash(password, 10)
    const usuario = new Usuario({
      correo,
      password: hashed,
      rol,
      empresa: empresaIdFinal
    })
    await usuario.save()
    const empresa = await Empresa.findById(empresaIdFinal)
    if (empresa) {
      empresa.usuarios.push(usuario._id)
      await empresa.save()
    }
    const { password: _, ...usuarioSinPass } = usuario.toObject()
    res.status(201).json(usuarioSinPass)
  } catch (err) {
    console.error('Error al crear usuario:', err)
    res.status(500).json({ error: 'Error al crear usuario' })
  }
}

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
    const usuario = await Usuario.findById(userId)
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })
    if (req.user.rol !== 'superadmin') {
      const miEmpresa = req.user.empresaId || req.user.empresa
      if (!miEmpresa || usuario.empresa?.toString() !== miEmpresa.toString()) {
        return res.status(403).json({ error: 'No puedes eliminar usuarios de otra empresa' })
      }
    }

    // Quitar el usuario del array de usuarios de su empresa
    await Empresa.findByIdAndUpdate(usuario.empresa, {
      $pull: { usuarios: usuario._id }
    })
    await Usuario.findByIdAndDelete(userId)

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
    if (req.user.rol !== 'superadmin') {
      const miEmpresa = req.user.empresaId || req.user.empresa
      if (!miEmpresa || usuario.empresa?.toString() !== miEmpresa.toString()) {
        return res.status(403).json({ error: 'No puedes editar usuarios de otra empresa' })
      }
    }

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
  listarUsuarios,
  crearUsuario,
  getPerfil,
  eliminarUsuario,
  editarUsuario
}