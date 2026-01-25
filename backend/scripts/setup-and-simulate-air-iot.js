/**
 * Script Completo: Setup + Simulación para Air IoT
 * 
 * Este script:
 * 1. Crea la empresa "Air IoT"
 * 2. Crea usuario admin: admin@airiot.com / admin123
 * 3. Crea 3 dispositivos (esp32-air-001, esp32-air-002, esp32-air-003)
 * 4. Simula lecturas MQTT para cada dispositivo
 * 
 * Uso:
 *   node scripts/setup-and-simulate-air-iot.js
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

// Detectar si estamos en Docker o fuera
const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true'
const MONGODB_URI = process.env.MONGODB_URI || (isDocker ? 'mongodb://mongo:27017/smca' : 'mongodb://localhost:27017/smca')
const MQTT_HOST = process.env.MQTT_HOST || (isDocker ? 'mqtts://mosquitto:8883' : 'mqtts://localhost:8883')
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'iot/aire/lectura'

// Configuración
const EMPRESA_NOMBRE = 'Air IoT'
const DISPOSITIVOS = [
  {
    sensorId: 'esp32-air-001',
    nombre: 'Sensor Principal - Planta A',
    zona: 'Planta A',
    ubicacion: { lat: -34.603722, lng: -58.381592 },
    parametrosSoportados: ['pm25', 'pm10', 'co2', 'temperatura', 'humedad'],
    deviceId: 'nodo01'  // Certificado a usar
  },
  {
    sensorId: 'esp32-air-002',
    nombre: 'Sensor Secundario - Planta B',
    zona: 'Planta B',
    ubicacion: { lat: -34.604722, lng: -58.382592 },
    parametrosSoportados: ['pm25', 'pm10', 'no2', 'co2', 'co', 'temperatura', 'humedad'],
    deviceId: 'nodo02'
  },
  {
    sensorId: 'esp32-air-003',
    nombre: 'Sensor Exterior - Patio',
    zona: 'Patio Exterior',
    ubicacion: { lat: -34.602722, lng: -58.380592 },
    parametrosSoportados: ['pm25', 'pm10', 'temperatura', 'humedad'],
    deviceId: 'nodo03'
  }
]

const NUM_READINGS_PER_DEVICE = 7  // ~20 lecturas totales
const INTERVAL_MS = 1500

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

function generateReading(sensorId, parametros) {
  const lectura = {
    sensorId: sensorId,
    timestamp: new Date().toISOString()
  }

  parametros.forEach(param => {
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
  console.log('📋 Paso 1: Configurando empresa "Air IoT"...\n')

  // Crear empresa
  let empresa = await Empresa.findOne({ nombre: EMPRESA_NOMBRE })
  if (!empresa) {
    empresa = new Empresa({ nombre: EMPRESA_NOMBRE })
    await empresa.save()
    console.log(`✅ Empresa "${EMPRESA_NOMBRE}" creada`)
  } else {
    console.log(`✅ Empresa "${EMPRESA_NOMBRE}" ya existe`)
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
    console.log(`✅ Usuario admin creado: ${adminEmail} / admin123`)
  } else {
    console.log(`✅ Usuario admin ya existe: ${adminEmail}`)
  }

  // Crear dispositivos
  console.log(`\n📡 Creando dispositivos...\n`)
  const dispositivosCreados = []

  for (const deviceData of DISPOSITIVOS) {
    let dispositivo = await Dispositivo.findOne({ sensorId: deviceData.sensorId })
    
    if (!dispositivo) {
      dispositivo = new Dispositivo({
        sensorId: deviceData.sensorId,
        nombre: deviceData.nombre,
        zona: deviceData.zona,
        empresa: empresa._id,
        ubicacion: deviceData.ubicacion,
        parametrosSoportados: deviceData.parametrosSoportados,
        estado: 'inactivo'
      })
      await dispositivo.save()
      console.log(`✅ Dispositivo creado: ${deviceData.sensorId}`)
    } else {
      // Actualizar empresa si es necesario
      if (dispositivo.empresa.toString() !== empresa._id.toString()) {
        dispositivo.empresa = empresa._id
        await dispositivo.save()
        console.log(`✅ Dispositivo ${deviceData.sensorId} actualizado a empresa "${EMPRESA_NOMBRE}"`)
      } else {
        console.log(`⚠️  Dispositivo ${deviceData.sensorId} ya existe`)
      }
    }
    
    dispositivosCreados.push({ ...deviceData, dispositivo })
  }

  console.log(`\n✅ Setup completado!`)
  console.log(`   Empresa: ${EMPRESA_NOMBRE}`)
  console.log(`   Usuario: ${adminEmail} / admin123`)
  console.log(`   Dispositivos: ${dispositivosCreados.length}\n`)

  return { empresa, dispositivosCreados }
}

async function simulateMQTTReadings(dispositivos) {
  console.log('📡 Paso 2: Simulando lecturas MQTT...\n')
  console.log(`   Entorno: ${isDocker ? 'Docker' : 'Local'}`)
  console.log(`   MQTT Host: ${MQTT_HOST}\n`)

  // Certificados (detecta automáticamente el entorno)
  let CERT_DIR
  if (isDocker) {
    // En Docker, los certificados están montados en /mqtt/certs
    CERT_DIR = '/mqtt/certs'
  } else {
    const projectRoot = path.join(__dirname, '../..')
    CERT_DIR = fs.existsSync(path.join(projectRoot, 'mqtt/certs'))
      ? path.join(projectRoot, 'mqtt/certs')
      : path.join(__dirname, '../../mqtt/certs')
  }
  
  const CA_CERT = path.join(CERT_DIR, 'ca/ca.crt')

  if (!fs.existsSync(CA_CERT)) {
    console.error('❌ Certificados no encontrados')
    console.error('   Genera con: cd mqtt && ./generate_certs_v2.sh')
    return
  }

  // Simular para cada dispositivo
  for (let i = 0; i < dispositivos.length; i++) {
    const deviceData = dispositivos[i]
    const deviceId = deviceData.deviceId
    const sensorId = deviceData.sensorId
    const parametros = deviceData.parametrosSoportados

    console.log(`\n📤 Dispositivo ${i + 1}/${dispositivos.length}: ${sensorId}`)
    console.log(`   Certificado: ${deviceId}`)
    console.log(`   Parámetros: ${parametros.join(', ')}`)

    const CLIENT_CERT = path.join(CERT_DIR, `clients/${deviceId}/client.crt`)
    const CLIENT_KEY = path.join(CERT_DIR, `clients/${deviceId}/client.key`)

    if (!fs.existsSync(CLIENT_CERT) || !fs.existsSync(CLIENT_KEY)) {
      console.error(`   ⚠️  Certificados de ${deviceId} no encontrados, saltando...`)
      continue
    }

    await new Promise((resolve, reject) => {
      const options = {
        clientId: `${sensorId}_sim_${Date.now()}`,
        rejectUnauthorized: true,
        ca: fs.readFileSync(CA_CERT),
        cert: fs.readFileSync(CLIENT_CERT),
        key: fs.readFileSync(CLIENT_KEY)
      }

      const client = mqtt.connect(MQTT_HOST, options)
      let sentCount = 0

      client.on('connect', () => {
        console.log(`   ✅ Conectado al broker MQTT`)

        const sendNext = () => {
          if (sentCount >= NUM_READINGS_PER_DEVICE) {
            console.log(`   ✅ ${sentCount} lecturas enviadas`)
            client.end()
            resolve()
            return
          }

          const lectura = generateReading(sensorId, parametros)
          const payload = JSON.stringify(lectura)

          client.publish(MQTT_TOPIC, payload, { qos: 1 }, (err) => {
            sentCount++
            if (err) {
              console.error(`   ❌ Error: ${err.message}`)
            } else {
              const pm25 = lectura.pm25 ? `${lectura.pm25} µg/m³` : 'N/A'
              process.stdout.write(`   [${sentCount}/${NUM_READINGS_PER_DEVICE}] PM2.5: ${pm25}\r`)
            }

            if (sentCount < NUM_READINGS_PER_DEVICE) {
              setTimeout(sendNext, INTERVAL_MS)
            } else {
              console.log(`   ✅ ${sentCount} lecturas enviadas`)
              client.end()
              resolve()
            }
          })
        }

        sendNext()
      })

      client.on('error', (err) => {
        console.error(`   ❌ Error MQTT: ${err.message}`)
        reject(err)
      })

      // Timeout
      setTimeout(() => {
        if (sentCount < NUM_READINGS_PER_DEVICE) {
          console.error(`   ⏱️  Timeout`)
          client.end()
          resolve()
        }
      }, (NUM_READINGS_PER_DEVICE * INTERVAL_MS) + 5000)
    })

    // Pausa entre dispositivos
    if (i < dispositivos.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log(`\n✅ Simulación completada!\n`)
}

async function main() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Conectado a MongoDB\n')

    const { empresa, dispositivosCreados } = await setupAirIoT()
    await simulateMQTTReadings(dispositivosCreados)

    console.log('💡 Próximos pasos:')
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
