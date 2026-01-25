/**
 * Script para Simular un ESP32 Enviando Lecturas por MQTT
 * 
 * Este script simula exactamente lo que haría un ESP32 real:
 * - Se conecta por MQTT usando TLS con certificados
 * - Envía solo el sensorId y los valores ambientales
 * - NO necesita saber a qué empresa pertenece (el backend lo resuelve)
 * 
 * Uso:
 *   node scripts/simulate-esp32.js
 * 
 * Variables de entorno:
 *   SENSOR_ID=esp32-air-001    # Debe existir en la BD
 *   DEVICE_ID=nodo01           # ID del certificado a usar
 *   NUM_READINGS=20            # Número de lecturas a enviar
 *   INTERVAL_MS=2000          # Intervalo entre lecturas (ms)
 */

require('dotenv').config()
const mqtt = require('mqtt')
const fs = require('fs')
const path = require('path')

// ============== CONFIGURACIÓN ==============
// Detectar si estamos en Docker o fuera
const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true'
const MQTT_HOST = process.env.MQTT_HOST || (isDocker ? 'mqtts://mosquitto:8883' : 'mqtts://localhost:8883')
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'iot/aire/lectura'
const NUM_READINGS = parseInt(process.env.NUM_READINGS) || 20
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS) || 2000

// ⭐ El ESP32 solo necesita conocer su sensorId
// El backend buscará el dispositivo y obtendrá la empresa automáticamente
const SENSOR_ID = process.env.SENSOR_ID || 'esp32-air-001'

// Certificados (el ESP32 usaría certificados específicos, aquí usamos uno genérico)
const DEVICE_ID = process.env.DEVICE_ID || 'nodo01'

// Rutas de certificados (detecta automáticamente el entorno)
const projectRoot = path.join(__dirname, '../..')
let CERT_DIR

if (isDocker) {
  // Dentro de Docker: certificados montados en /mqtt/certs
  CERT_DIR = '/mqtt/certs'
} else {
  // Fuera de Docker: buscar en el proyecto
  if (fs.existsSync(path.join(projectRoot, 'mqtt/certs'))) {
    CERT_DIR = path.join(projectRoot, 'mqtt/certs')
  } else if (fs.existsSync(path.join(__dirname, '../../mqtt/certs'))) {
    CERT_DIR = path.join(__dirname, '../../mqtt/certs')
  } else {
    CERT_DIR = path.join(__dirname, '../../mqtt/certs') // Fallback
  }
}

const CA_CERT = path.join(CERT_DIR, 'ca/ca.crt')
const CLIENT_CERT = path.join(CERT_DIR, `clients/${DEVICE_ID}/client.crt`)
const CLIENT_KEY = path.join(CERT_DIR, `clients/${DEVICE_ID}/client.key`)

// ============== VALIDACIÓN ==============
function validateCertificates() {
  const missing = []
  if (!fs.existsSync(CA_CERT)) missing.push(`CA: ${CA_CERT}`)
  if (!fs.existsSync(CLIENT_CERT)) missing.push(`Client Cert: ${CLIENT_CERT}`)
  if (!fs.existsSync(CLIENT_KEY)) missing.push(`Client Key: ${CLIENT_KEY}`)
  
  if (missing.length > 0) {
    console.error('❌ Certificados faltantes:')
    missing.forEach(cert => console.error(`   - ${cert}`))
    console.error('\n💡 Genera los certificados con: cd mqtt && ./generate_certs_v2.sh')
    process.exit(1)
  }
}

// ============== GENERACIÓN DE DATOS (Como lo haría un ESP32) ==============

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

// Tipos de sensores (diferentes ESP32 pueden tener diferentes sensores)
const SENSOR_TYPES = {
  basic: ['pm25', 'pm10', 'temperatura', 'humedad'],
  medium: ['pm25', 'pm10', 'co2', 'temperatura', 'humedad'],
  advanced: ['pm25', 'pm10', 'no2', 'co2', 'co', 'tvoc', 'temperatura', 'humedad']
}

function randomValue(param) {
  const rango = RANGOS[param]
  if (!rango) return null
  return parseFloat((Math.random() * (rango.max - rango.min) + rango.min).toFixed(2))
}

/**
 * Genera una lectura como lo haría un ESP32 real
 * 
 * ⭐ IMPORTANTE: El ESP32 solo envía:
 * - sensorId: Su identificador único
 * - Valores ambientales: Los que puede medir
 * 
 * NO envía:
 * - empresaId (el backend lo obtiene del dispositivo)
 * - dispositivoId (el backend lo obtiene del dispositivo)
 */
function generateReading(sensorId, sensorType = 'medium') {
  const parametros = SENSOR_TYPES[sensorType]
  const lectura = {
    sensorId: sensorId,  // ⭐ Lo único que el ESP32 necesita conocer
    timestamp: new Date().toISOString()  // Opcional, pero recomendado
  }

  // Agregar valores ambientales que el ESP32 puede medir
  parametros.forEach(param => {
    const valor = randomValue(param)
    if (valor !== null) {
      lectura[param] = valor
    }
  })

  // Metadatos opcionales (si el ESP32 los tiene)
  if (Math.random() > 0.5) {
    lectura.version = `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`
  }

  if (Math.random() > 0.3) {
    lectura.calidad = Math.floor(Math.random() * 20) + 80 // 80-100
  }

  return lectura
}

// ============== SIMULACIÓN MQTT ==============
function simulateESP32() {
  console.log('🔐 Validando certificados...')
  validateCertificates()

  console.log(`\n📡 Simulando ESP32: ${SENSOR_ID}`)
  console.log(`   Broker: ${MQTT_HOST}`)
  console.log(`   Tópico: ${MQTT_TOPIC}`)
  console.log(`   Lecturas: ${NUM_READINGS}`)
  console.log(`   Intervalo: ${INTERVAL_MS}ms`)
  console.log(`\n💡 IMPORTANTE:`)
  console.log(`   - El sensorId "${SENSOR_ID}" debe estar registrado en la BD`)
  console.log(`   - El backend obtendrá la empresa automáticamente`)
  console.log(`   - Si el dispositivo no existe, las lecturas se ignorarán\n`)

  // Opciones de conexión TLS (como lo haría un ESP32)
  const options = {
    clientId: `${SENSOR_ID}_${Date.now()}`,
    rejectUnauthorized: true,
    ca: fs.readFileSync(CA_CERT),
    cert: fs.readFileSync(CLIENT_CERT),
    key: fs.readFileSync(CLIENT_KEY)
  }

  // Conectar al broker
  const client = mqtt.connect(MQTT_HOST, options)

  let sentCount = 0
  let errorCount = 0
  let successCount = 0

  client.on('connect', () => {
    console.log('✅ Conectado al broker MQTT\n')
    console.log('📤 Enviando lecturas (como lo haría un ESP32 real)...\n')

    // Alternar entre tipos de sensores para simular diferentes ESP32
    const sensorType = Math.floor(Math.random() * 3) === 0 ? 'basic' : 
                      Math.floor(Math.random() * 2) === 0 ? 'medium' : 'advanced'

    const sendNext = () => {
      if (sentCount >= NUM_READINGS) {
        console.log(`\n✅ Simulación completada!`)
        console.log(`   Lecturas enviadas: ${sentCount}`)
        console.log(`   Exitosas: ${successCount}`)
        console.log(`   Errores: ${errorCount}`)
        console.log(`\n💡 Verifica en el Dashboard del frontend`)
        console.log(`   (Inicia sesión con el usuario de la empresa del dispositivo)`)
        client.end()
        process.exit(0)
        return
      }

      // Generar lectura (como lo haría el ESP32)
      const lectura = generateReading(SENSOR_ID, sensorType)

      // Publicar en el tópico (el ESP32 solo envía esto)
      const payload = JSON.stringify(lectura)
      
      // Verificar que el cliente esté conectado antes de publicar
      if (!client.connected) {
        console.error(`[${sentCount + 1}/${NUM_READINGS}] ❌ Cliente no conectado`)
        errorCount++
        if (sentCount < NUM_READINGS) {
          setTimeout(sendNext, INTERVAL_MS)
        }
        return
      }
      
      client.publish(MQTT_TOPIC, payload, { qos: 1 }, (err) => {
        sentCount++
        
        if (err) {
          errorCount++
          console.error(`[${sentCount}/${NUM_READINGS}] ❌ Error al publicar: ${err.message}`)
        } else {
          // En MQTT, el callback puede no indicar si fue denegado
          // Verificamos el estado de la conexión
          successCount++
          const params = Object.keys(lectura).filter(k => 
            !['sensorId', 'timestamp', 'version', 'calidad'].includes(k)
          )
          const pm25Value = lectura.pm25 ? `${lectura.pm25} µg/m³` : 'N/A'
          console.log(`[${sentCount}/${NUM_READINGS}] ✅ ${SENSOR_ID} → ${params.length} params | PM2.5: ${pm25Value}`)
        }
        
        // Enviar siguiente lectura
        if (sentCount < NUM_READINGS) {
          setTimeout(sendNext, INTERVAL_MS)
        } else {
          console.log(`\n✅ Simulación completada!`)
          console.log(`   Lecturas enviadas: ${sentCount}`)
          console.log(`   Exitosas: ${successCount}`)
          console.log(`   Errores: ${errorCount}`)
          console.log(`\n💡 Verifica los logs de Mosquitto para confirmar que las publicaciones fueron aceptadas`)
          client.end()
          process.exit(0)
        }
      })
    }

    // Iniciar envío
    sendNext()
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
  simulateESP32()
}

module.exports = { simulateESP32, generateReading }
