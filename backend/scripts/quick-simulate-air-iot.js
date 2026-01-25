/**
 * Script rápido para simular lecturas de Air IoT
 * Ejecuta todo el proceso: setup + simulación
 * 
 * Uso:
 *   node scripts/quick-simulate-air-iot.js
 */

require('dotenv').config()
const mongoose = require('mongoose')
const mqtt = require('mqtt')
const fs = require('fs')
const path = require('path')
const Empresa = require('../src/db/Empresa')
const Dispositivo = require('../src/db/Dispositivo')
const Usuario = require('../src/db/Usuario')
const bcrypt = require('bcrypt')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/smca'
const MQTT_HOST = process.env.MQTT_HOST || 'mqtts://mosquitto:8883'
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'iot/aire/lectura'
const NUM_READINGS = 20

// Dispositivos de Air IoT
const DISPOSITIVOS = [
  { sensorId: 'esp32-air-001', deviceId: 'nodo01', zona: 'Planta A' },
  { sensorId: 'esp32-air-002', deviceId: 'nodo02', zona: 'Planta B' },
  { sensorId: 'esp32-air-003', deviceId: 'nodo03', zona: 'Patio Exterior' }
]

// Rangos de valores
const RANGOS = {
  pm25: { min: 5, max: 100 },
  pm10: { min: 10, max: 150 },
  no2: { min: 10, max: 200 },
  co2: { min: 400, max: 1200 },
  co: { min: 0.5, max: 10 },
  tvoc: { min: 0, max: 500 },
  temperatura: { min: 18, max: 28 },
  humedad: { min: 30, max: 80 }
}

function randomValue(param) {
  const rango = RANGOS[param]
  return parseFloat((Math.random() * (rango.max - rango.min) + rango.min).toFixed(2))
}

function generateReading(sensorId, zona, deviceType = 'medium') {
  const tipos = {
    basic: ['pm25', 'pm10', 'temperatura', 'humedad'],
    medium: ['pm25', 'pm10', 'co2', 'temperatura', 'humedad'],
    advanced: ['pm25', 'pm10', 'no2', 'co2', 'co', 'tvoc', 'temperatura', 'humedad']
  }
  
  const params = tipos[deviceType]
  const lectura = {
    sensorId,
    zona,
    timestamp: new Date().toISOString()
  }

  params.forEach(param => {
    lectura[param] = randomValue(param)
  })

  if (Math.random() > 0.5) {
    lectura.version = `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`
  }

  if (Math.random() > 0.3) {
    lectura.calidad = Math.floor(Math.random() * 20) + 80
  }

  return lectura
}

async function setupAirIoT() {
  console.log('📋 Configurando empresa "Air IoT"...\n')
  
  // Crear empresa
  let empresa = await Empresa.findOne({ nombre: 'Air IoT' })
  if (!empresa) {
    empresa = new Empresa({ nombre: 'Air IoT' })
    await empresa.save()
    console.log('✅ Empresa "Air IoT" creada')
  } else {
    console.log('✅ Empresa "Air IoT" ya existe')
  }

  // Crear usuario admin
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
    console.log('✅ Usuario admin creado: admin@airiot.com / admin123')
  } else {
    console.log('✅ Usuario admin ya existe')
  }

  // Crear dispositivos
  for (const deviceData of DISPOSITIVOS) {
    let dispositivo = await Dispositivo.findOne({ sensorId: deviceData.sensorId })
    if (!dispositivo) {
      dispositivo = new Dispositivo({
        sensorId: deviceData.sensorId,
        nombre: `Sensor ${deviceData.sensorId}`,
        zona: deviceData.zona,
        empresa: empresa._id,
        ubicacion: {
          lat: -34.603722 + (Math.random() - 0.5) * 0.01,
          lng: -58.381592 + (Math.random() - 0.5) * 0.01
        },
        parametrosSoportados: ['pm25', 'pm10', 'co2', 'temperatura', 'humedad'],
        estado: 'inactivo'
      })
      await dispositivo.save()
      console.log(`✅ Dispositivo creado: ${deviceData.sensorId}`)
    }
  }

  return empresa
}

async function simulateMQTT(empresa) {
  console.log('\n📡 Conectando a MQTT...\n')

  // Certificados (usar nodo01 por defecto)
  const CERT_DIR = path.join(__dirname, '../../mqtt/certs')
  const CA_CERT = path.join(CERT_DIR, 'ca/ca.crt')
  const CLIENT_CERT = path.join(CERT_DIR, 'clients/nodo01/client.crt')
  const CLIENT_KEY = path.join(CERT_DIR, 'clients/nodo01/client.key')

  if (!fs.existsSync(CA_CERT) || !fs.existsSync(CLIENT_CERT) || !fs.existsSync(CLIENT_KEY)) {
    console.error('❌ Certificados no encontrados')
    console.error('   Genera los certificados con: cd mqtt && ./generate_certs_v2.sh')
    return
  }

  const options = {
    clientId: `air_iot_simulator_${Date.now()}`,
    rejectUnauthorized: true,
    ca: fs.readFileSync(CA_CERT),
    cert: fs.readFileSync(CLIENT_CERT),
    key: fs.readFileSync(CLIENT_KEY)
  }

  return new Promise((resolve, reject) => {
    const client = mqtt.connect(MQTT_HOST, options)
    let sentCount = 0
    let totalToSend = NUM_READINGS * DISPOSITIVOS.length

    client.on('connect', () => {
      console.log('✅ Conectado al broker MQTT\n')
      console.log('📤 Enviando lecturas...\n')

      const sendNext = () => {
        if (sentCount >= totalToSend) {
          console.log(`\n✅ Simulación completada!`)
          console.log(`   Lecturas enviadas: ${sentCount}`)
          client.end()
          resolve()
          return
        }

        const deviceIndex = Math.floor(sentCount / NUM_READINGS) % DISPOSITIVOS.length
        const device = DISPOSITIVOS[deviceIndex]
        const deviceType = deviceIndex % 3 === 0 ? 'basic' : deviceIndex % 3 === 1 ? 'medium' : 'advanced'
        
        const lectura = generateReading(device.sensorId, device.zona, deviceType)
        const payload = JSON.stringify(lectura)

        client.publish(MQTT_TOPIC, payload, { qos: 1 }, (err) => {
          if (err) {
            console.error(`❌ Error: ${err.message}`)
          } else {
            sentCount++
            const params = Object.keys(lectura).filter(k => 
              !['sensorId', 'zona', 'timestamp', 'version', 'calidad'].includes(k)
            )
            console.log(`[${sentCount}/${totalToSend}] ✅ ${device.sensorId} → ${params.length} params | PM2.5: ${lectura.pm25 || 'N/A'} µg/m³`)
          }
          
          setTimeout(sendNext, 500) // 500ms entre lecturas
        })
      }

      sendNext()
    })

    client.on('error', (err) => {
      console.error('❌ Error MQTT:', err.message)
      reject(err)
    })
  })
}

async function main() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Conectado a MongoDB\n')

    const empresa = await setupAirIoT()
    await simulateMQTT(empresa)

    console.log('\n💡 Próximos pasos:')
    console.log('   1. Inicia sesión con: admin@airiot.com / admin123')
    console.log('   2. Ve al Dashboard para ver las lecturas')
    console.log('   3. Las lecturas deberían aparecer automáticamente\n')

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    await mongoose.disconnect()
    process.exit(1)
  }
}

main()
