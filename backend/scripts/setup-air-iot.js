/**
 * Script para configurar la empresa "Air IoT" y sus dispositivos
 * 
 * Uso:
 *   node scripts/setup-air-iot.js
 */

require('dotenv').config()
const mongoose = require('mongoose')
const Empresa = require('../src/db/Empresa')
const Dispositivo = require('../src/db/Dispositivo')
const Usuario = require('../src/db/Usuario')
const bcrypt = require('bcrypt')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/smca'

// Configuración
const EMPRESA_NOMBRE = 'Air IoT'
const DISPOSITIVOS = [
  {
    sensorId: 'esp32-air-001',
    nombre: 'Sensor Principal - Planta A',
    zona: 'Planta A',
    ubicacion: { lat: -34.603722, lng: -58.381592 },
    parametrosSoportados: ['pm25', 'pm10', 'co2', 'temperatura', 'humedad']
  },
  {
    sensorId: 'esp32-air-002',
    nombre: 'Sensor Secundario - Planta B',
    zona: 'Planta B',
    ubicacion: { lat: -34.604722, lng: -58.382592 },
    parametrosSoportados: ['pm25', 'pm10', 'no2', 'co2', 'co', 'temperatura', 'humedad']
  },
  {
    sensorId: 'esp32-air-003',
    nombre: 'Sensor Exterior - Patio',
    zona: 'Patio Exterior',
    ubicacion: { lat: -34.602722, lng: -58.380592 },
    parametrosSoportados: ['pm25', 'pm10', 'temperatura', 'humedad']
  }
]

async function setupAirIoT() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Conectado a MongoDB\n')

    // Crear o obtener empresa
    let empresa = await Empresa.findOne({ nombre: EMPRESA_NOMBRE })
    if (!empresa) {
      empresa = new Empresa({ nombre: EMPRESA_NOMBRE })
      await empresa.save()
      console.log(`✅ Empresa "${EMPRESA_NOMBRE}" creada`)
    } else {
      console.log(`✅ Empresa "${EMPRESA_NOMBRE}" ya existe`)
    }

    // Crear usuario admin para Air IoT (si no existe)
    const adminEmail = 'admin@airiot.com'
    let admin = await Usuario.findOne({ correo: adminEmail })
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      admin = new Usuario({
        correo: adminEmail,
        password: hashedPassword,
        rol: 'admin',
        empresa: empresa._id
      })
      await admin.save()
      empresa.usuarios.push(admin._id)
      await empresa.save()
      console.log(`✅ Usuario admin creado: ${adminEmail} / admin123`)
    } else {
      console.log(`✅ Usuario admin ya existe: ${adminEmail}`)
    }

    // Crear dispositivos
    console.log(`\n📡 Creando dispositivos para "${EMPRESA_NOMBRE}"...\n`)
    
    for (const deviceData of DISPOSITIVOS) {
      let dispositivo = await Dispositivo.findOne({ sensorId: deviceData.sensorId })
      
      if (!dispositivo) {
        dispositivo = new Dispositivo({
          ...deviceData,
          empresa: empresa._id,
          estado: 'inactivo',
          fechaRegistro: new Date()
        })
        await dispositivo.save()
        console.log(`✅ Dispositivo creado: ${deviceData.sensorId}`)
        console.log(`   Nombre: ${deviceData.nombre}`)
        console.log(`   Zona: ${deviceData.zona}`)
        console.log(`   Parámetros: ${deviceData.parametrosSoportados.join(', ')}`)
      } else {
        // Actualizar empresa si ya existía
        if (dispositivo.empresa.toString() !== empresa._id.toString()) {
          dispositivo.empresa = empresa._id
          await dispositivo.save()
          console.log(`✅ Dispositivo ${deviceData.sensorId} actualizado a empresa "${EMPRESA_NOMBRE}"`)
        } else {
          console.log(`⚠️  Dispositivo ${deviceData.sensorId} ya existe`)
        }
      }
    }

    console.log(`\n✅ Configuración completada para "${EMPRESA_NOMBRE}"`)
    console.log(`\n📋 Resumen:`)
    console.log(`   Empresa: ${EMPRESA_NOMBRE}`)
    console.log(`   Usuario: ${adminEmail} / admin123`)
    console.log(`   Dispositivos: ${DISPOSITIVOS.length}`)
    console.log(`\n💡 Para simular lecturas:`)
    console.log(`   SENSOR_ID=esp32-air-001 node scripts/simulate-mqtt-readings.js`)
    console.log(`   SENSOR_ID=esp32-air-002 node scripts/simulate-mqtt-readings.js`)
    console.log(`   SENSOR_ID=esp32-air-003 node scripts/simulate-mqtt-readings.js`)

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    await mongoose.disconnect()
    process.exit(1)
  }
}

setupAirIoT()
