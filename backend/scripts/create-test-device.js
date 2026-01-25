/**
 * Script para crear un dispositivo de prueba para simulación MQTT
 * 
 * Uso:
 *   SENSOR_ID=esp32-001 node scripts/create-test-device.js
 */

require('dotenv').config()
const mongoose = require('mongoose')
const Dispositivo = require('../src/db/Dispositivo')
const Empresa = require('../src/db/Empresa')

const SENSOR_ID = process.env.SENSOR_ID || 'esp32-001'
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/smca'

async function createTestDevice() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Conectado a MongoDB\n')

    // Verificar si ya existe
    const existente = await Dispositivo.findOne({ sensorId: SENSOR_ID })
    if (existente) {
      console.log(`⚠️  El dispositivo ${SENSOR_ID} ya existe`)
      console.log(`   Nombre: ${existente.nombre}`)
      console.log(`   Zona: ${existente.zona}`)
      await mongoose.disconnect()
      process.exit(0)
    }

    // Obtener o crear empresa de prueba
    let empresa = await Empresa.findOne({ nombre: 'Empresa Test' })
    if (!empresa) {
      empresa = new Empresa({ nombre: 'Empresa Test' })
      await empresa.save()
      console.log('✅ Empresa "Empresa Test" creada')
    }

    // Crear dispositivo
    const dispositivo = new Dispositivo({
      sensorId: SENSOR_ID,
      nombre: `Sensor ${SENSOR_ID}`,
      zona: 'Zona A',
      empresa: empresa._id,
      ubicacion: {
        lat: -34.603722,
        lng: -58.381592
      },
      descripcion: 'Dispositivo de prueba para simulación MQTT',
      parametrosSoportados: ['pm25', 'pm10', 'co2', 'temperatura', 'humedad'],
      estado: 'inactivo'
    })

    await dispositivo.save()

    console.log(`\n✅ Dispositivo creado:`)
    console.log(`   Sensor ID: ${dispositivo.sensorId}`)
    console.log(`   Nombre: ${dispositivo.nombre}`)
    console.log(`   Zona: ${dispositivo.zona}`)
    console.log(`   Empresa: ${empresa.nombre}`)
    console.log(`   Parámetros: ${dispositivo.parametrosSoportados.join(', ')}`)
    console.log(`\n✅ Listo para usar en simulación MQTT\n`)

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    await mongoose.disconnect()
    process.exit(1)
  }
}

createTestDevice()
