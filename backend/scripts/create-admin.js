/**
 * Script para crear un usuario administrador inicial
 * Ejecutar desde el contenedor: docker exec backend node /app/scripts/create-admin.js
 * O localmente: MONGODB_URI=mongodb://localhost:27017/smca node scripts/create-admin.js
 */

const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const Usuario = require('../src/db/Usuario')
const Empresa = require('../src/db/Empresa')

const DEFAULT_EMAIL = 'super@smca.com'
const DEFAULT_PASSWORD = 'admin123'
const DEFAULT_EMPRESA = 'SMCA Admin'

// URI de MongoDB: desde variable de entorno o por defecto (Docker usa 'mongo', local usa 'localhost')
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/smca'

async function createAdmin() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Conectado a MongoDB')

    // Verificar si el usuario ya existe
    const existeUsuario = await Usuario.findOne({ correo: DEFAULT_EMAIL })
    if (existeUsuario) {
      console.log(`⚠️  El usuario ${DEFAULT_EMAIL} ya existe`)
      console.log('   Si quieres cambiarlo, elimínalo primero desde MongoDB')
      await mongoose.disconnect()
      return
    }

    // Crear o buscar empresa
    let empresa = await Empresa.findOne({ nombre: DEFAULT_EMPRESA })
    if (!empresa) {
      empresa = new Empresa({ nombre: DEFAULT_EMPRESA })
      await empresa.save()
      console.log(`✅ Empresa "${DEFAULT_EMPRESA}" creada`)
    } else {
      console.log(`✅ Empresa "${DEFAULT_EMPRESA}" ya existe`)
    }

    // Crear usuario
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)
    const usuario = new Usuario({
      correo: DEFAULT_EMAIL,
      password: hashedPassword,
      rol: 'superadmin',
      empresa: empresa._id
    })
    await usuario.save()

    // Actualizar empresa con el usuario
    empresa.usuarios.push(usuario._id)
    await empresa.save()

    console.log('\n✅ Usuario creado exitosamente:')
    console.log(`   Correo: ${DEFAULT_EMAIL}`)
    console.log(`   Contraseña: ${DEFAULT_PASSWORD}`)
    console.log(`   Rol: superadmin`)
    console.log(`   Empresa: ${DEFAULT_EMPRESA}`)
    console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer login\n')

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    await mongoose.disconnect()
    process.exit(1)
  }
}

createAdmin()
