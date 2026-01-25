/**
 * Script helper para verificar que un dispositivo existe en la BD
 * antes de ejecutar la simulación MQTT
 */

require('dotenv').config()
const mongoose = require('mongoose')
const Dispositivo = require('../src/db/Dispositivo')

const SENSOR_ID = process.env.SENSOR_ID || 'esp32-001'
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/smca'

async function checkDevice() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Conectado a MongoDB\n')

    const dispositivo = await Dispositivo.findOne({ sensorId: SENSOR_ID })
    
    if (!dispositivo) {
      console.log(`❌ Dispositivo con sensorId "${SENSOR_ID}" no encontrado\n`)
      console.log('💡 Opciones:')
      console.log('   1. Crear el dispositivo desde el frontend')
      console.log('   2. Cambiar SENSOR_ID a uno existente')
      console.log('   3. Usar el script create-device.js para crear uno\n')
      
      // Mostrar dispositivos existentes
      const dispositivos = await Dispositivo.find().limit(5)
      if (dispositivos.length > 0) {
        console.log('📋 Dispositivos disponibles:')
        dispositivos.forEach(d => {
          console.log(`   - ${d.sensorId} (${d.nombre})`)
        })
      }
      
      await mongoose.disconnect()
      process.exit(1)
    }

    console.log(`✅ Dispositivo encontrado:`)
    console.log(`   Sensor ID: ${dispositivo.sensorId}`)
    console.log(`   Nombre: ${dispositivo.nombre}`)
    console.log(`   Zona: ${dispositivo.zona}`)
    console.log(`   Estado: ${dispositivo.estado}`)
    console.log(`   Empresa: ${dispositivo.empresa}`)
    if (dispositivo.parametrosSoportados && dispositivo.parametrosSoportados.length > 0) {
      console.log(`   Parámetros: ${dispositivo.parametrosSoportados.join(', ')}`)
    }
    console.log('\n✅ Listo para simular lecturas MQTT\n')

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    await mongoose.disconnect()
    process.exit(1)
  }
}

checkDevice()
