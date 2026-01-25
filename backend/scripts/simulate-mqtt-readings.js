/**
 * Script para simular envío de lecturas por MQTT desde un ESP32
 * 
 * Este script simula el comportamiento de un ESP32 enviando datos ambientales
 * por MQTT usando TLS con certificados.
 * 
 * Uso:
 *   node scripts/simulate-mqtt-readings.js
 * 
 * O desde Docker:
 *   docker exec backend node /app/scripts/simulate-mqtt-readings.js
 */

require('dotenv').config()
const mqtt = require('mqtt')
const fs = require('fs')
const path = require('path')

// ============== CONFIGURACIÓN ==============
const MQTT_HOST = process.env.MQTT_HOST || 'mqtts://localhost:8883'
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'iot/aire/lectura'
const NUM_READINGS = parseInt(process.env.NUM_READINGS) || 20
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS) || 2000 // 2 segundos entre lecturas

// Certificados (ajustar según el dispositivo a simular)
// Por defecto usa nodo01, pero puedes cambiar a nodo02, nodo03, etc.
const DEVICE_ID = process.env.DEVICE_ID || 'nodo01'
// Por defecto usa dispositivo de Air IoT
const SENSOR_ID = process.env.SENSOR_ID || 'esp32-air-001'

// Rutas de certificados
// Intenta desde la raíz del proyecto primero, luego desde el contenedor
const projectRoot = path.join(__dirname, '../..')
const dockerRoot = '/app'

let CERT_DIR
if (fs.existsSync(path.join(projectRoot, 'mqtt/certs'))) {
  CERT_DIR = path.join(projectRoot, 'mqtt/certs')
} else if (fs.existsSync(path.join(dockerRoot, '../mqtt/certs'))) {
  CERT_DIR = path.join(dockerRoot, '../mqtt/certs')
} else {
  CERT_DIR = path.join(__dirname, '../../mqtt/certs')
}

const CA_CERT = path.join(CERT_DIR, 'ca/ca.crt')
const CLIENT_CERT = path.join(CERT_DIR, `clients/${DEVICE_ID}/client.crt`)
const CLIENT_KEY = path.join(CERT_DIR, `clients/${DEVICE_ID}/client.key`)

// ============== VALIDACIÓN DE CERTIFICADOS ==============
function validateCertificates() {
  const missing = []
  if (!fs.existsSync(CA_CERT)) missing.push(`CA: ${CA_CERT}`)
  if (!fs.existsSync(CLIENT_CERT)) missing.push(`Client Cert: ${CLIENT_CERT}`)
  if (!fs.existsSync(CLIENT_KEY)) missing.push(`Client Key: ${CLIENT_KEY}`)
  
  if (missing.length > 0) {
    console.error('❌ Certificados faltantes:')
    missing.forEach(cert => console.error(`   - ${cert}`))
    console.error('\n💡 Asegúrate de que los certificados estén generados.')
    console.error(`   Ejecuta: cd mqtt && ./generate_certs_v2.sh`)
    process.exit(1)
  }
}

// ============== GENERACIÓN DE DATOS ==============

// Rangos realistas de valores ambientales
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

// Tipos de dispositivos con diferentes parámetros
const DEVICE_TYPES = {
  basic: ['pm25', 'pm10', 'temperatura', 'humedad'],
  medium: ['pm25', 'pm10', 'co2', 'temperatura', 'humedad'],
  advanced: ['pm25', 'pm10', 'no2', 'co2', 'co', 'tvoc', 'temperatura', 'humedad']
}

function randomValue(param) {
  const rango = RANGOS[param]
  if (!rango) return null
  return parseFloat((Math.random() * (rango.max - rango.min) + rango.min).toFixed(2))
}

function generateReading(deviceType = 'medium') {
  const parametros = DEVICE_TYPES[deviceType]
  const lectura = {
    sensorId: SENSOR_ID,
    zona: `Zona ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`, // A-E
    timestamp: new Date().toISOString()
  }

  // Agregar parámetros según el tipo de dispositivo
  parametros.forEach(param => {
    lectura[param] = randomValue(param)
  })

  // Metadatos opcionales
  if (Math.random() > 0.5) {
    lectura.version = `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`
  }

  if (Math.random() > 0.3) {
    lectura.calidad = Math.floor(Math.random() * 20) + 80 // 80-100
  }

  return lectura
}

// ============== CONEXIÓN MQTT ==============
function simulateReadings() {
  console.log('🔐 Validando certificados...')
  validateCertificates()

  console.log(`\n📡 Conectando a ${MQTT_HOST}...`)
  console.log(`   Dispositivo: ${DEVICE_ID}`)
  console.log(`   Sensor ID: ${SENSOR_ID}`)
  console.log(`   Tópico: ${MQTT_TOPIC}`)
  console.log(`   Lecturas a enviar: ${NUM_READINGS}`)
  console.log(`   Intervalo: ${INTERVAL_MS}ms\n`)

  // Opciones de conexión TLS
  const options = {
    clientId: `${DEVICE_ID}_simulator_${Date.now()}`,
    rejectUnauthorized: true,
    ca: fs.readFileSync(CA_CERT),
    cert: fs.readFileSync(CLIENT_CERT),
    key: fs.readFileSync(CLIENT_KEY)
  }

  // Conectar al broker
  const client = mqtt.connect(MQTT_HOST, options)

  let sentCount = 0
  let errorCount = 0

  client.on('connect', () => {
    console.log('✅ Conectado al broker MQTT\n')
    console.log('📤 Enviando lecturas...\n')

    // Función para enviar una lectura
    const sendReading = () => {
      if (sentCount >= NUM_READINGS) {
        console.log(`\n✅ Simulación completada!`)
        console.log(`   Lecturas enviadas: ${sentCount}`)
        console.log(`   Errores: ${errorCount}`)
        client.end()
        process.exit(0)
        return
      }

      // Generar lectura (alternar entre tipos de dispositivos)
      const deviceType = sentCount % 3 === 0 ? 'basic' : 
                        sentCount % 3 === 1 ? 'medium' : 'advanced'
      const lectura = generateReading(deviceType)

      // Publicar en el tópico
      const payload = JSON.stringify(lectura)
      
      client.publish(MQTT_TOPIC, payload, { qos: 1 }, (err) => {
        if (err) {
          errorCount++
          console.error(`❌ Error al publicar lectura ${sentCount + 1}:`, err.message)
          // Continuar intentando
          setTimeout(sendReading, INTERVAL_MS)
        } else {
          sentCount++
          const params = Object.keys(lectura).filter(k => 
            !['sensorId', 'zona', 'timestamp', 'version', 'calidad'].includes(k)
          )
          const pm25Value = lectura.pm25 ? `${lectura.pm25} µg/m³` : 'N/A'
          console.log(`[${sentCount}/${NUM_READINGS}] ✅ ${SENSOR_ID} → ${params.length} params | PM2.5: ${pm25Value}`)
          
          // Enviar siguiente lectura
          if (sentCount < NUM_READINGS) {
            setTimeout(sendReading, INTERVAL_MS)
          } else {
            console.log(`\n✅ Simulación completada!`)
            console.log(`   Lecturas enviadas: ${sentCount}`)
            console.log(`   Errores: ${errorCount}`)
            client.end()
            process.exit(0)
          }
        }
      })
    }

    // Iniciar envío de lecturas
    sendReading()
  })

  client.on('error', (err) => {
    console.error('❌ Error en cliente MQTT:', err.message)
    errorCount++
  })

  client.on('close', () => {
    console.log('\n🔌 Desconectado del broker MQTT')
  })

  // Timeout de seguridad
  setTimeout(() => {
    if (sentCount < NUM_READINGS) {
      console.error('\n⏱️  Timeout: No se completaron todas las lecturas')
      client.end()
      process.exit(1)
    }
  }, (NUM_READINGS * INTERVAL_MS) + 10000)
}

// ============== EJECUCIÓN ==============
if (require.main === module) {
  simulateReadings()
}

module.exports = { simulateReadings, generateReading }
