/**
 * Script para verificar la conexión MQTT del backend
 * 
 * Este script verifica:
 * 1. Si el backend puede conectarse a MQTT
 * 2. Si está suscrito correctamente
 * 3. Si puede recibir mensajes
 */

require('dotenv').config()
const mqtt = require('mqtt')
const fs = require('fs')
const path = require('path')

const MQTT_HOST = process.env.MQTT_HOST || 'mqtts://mosquitto:8883'
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'iot/aire/lectura'
const CLIENT_ID = process.env.CLIENT_ID || 'backend_smca'

// Detectar si estamos en Docker
const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true'

// Rutas de certificados
let CA_CERT, CLIENT_CERT, CLIENT_KEY

if (isDocker) {
  // Dentro de Docker: usar rutas del env o defaults
  CA_CERT = process.env.CA_CERT || './certs/ca.crt'
  CLIENT_CERT = process.env.CLIENT_CERT || './certs/client.crt'
  CLIENT_KEY = process.env.CLIENT_KEY || './certs/client.key'
} else {
  // Fuera de Docker: buscar en el proyecto
  const projectRoot = path.join(__dirname, '../..')
  const certDir = fs.existsSync(path.join(projectRoot, 'backend/certs'))
    ? path.join(projectRoot, 'backend/certs')
    : path.join(projectRoot, 'mqtt/certs')
  
  CA_CERT = path.join(certDir, 'ca.crt')
  CLIENT_CERT = path.join(certDir, 'client.crt')
  CLIENT_KEY = path.join(certDir, 'client.key')
}

console.log('🔍 Verificando conexión MQTT...\n')
console.log(`   Entorno: ${isDocker ? 'Docker' : 'Local'}`)
console.log(`   Host: ${MQTT_HOST}`)
console.log(`   Tópico: ${MQTT_TOPIC}`)
console.log(`   Client ID: ${CLIENT_ID}\n`)

// Verificar certificados
console.log('📜 Verificando certificados...')
const missing = []
if (!fs.existsSync(CA_CERT)) missing.push(`CA: ${CA_CERT}`)
if (!fs.existsSync(CLIENT_CERT)) missing.push(`Client Cert: ${CLIENT_CERT}`)
if (!fs.existsSync(CLIENT_KEY)) missing.push(`Client Key: ${CLIENT_KEY}`)

if (missing.length > 0) {
  console.error('❌ Certificados no encontrados:')
  missing.forEach(m => console.error(`   - ${m}`))
  process.exit(1)
}

console.log('✅ Todos los certificados encontrados\n')

// Intentar conectar
console.log('🔌 Intentando conectar a MQTT...')

const options = {
  clientId: `${CLIENT_ID}_test_${Date.now()}`,
  rejectUnauthorized: true,
  ca: fs.readFileSync(CA_CERT),
  cert: fs.readFileSync(CLIENT_CERT),
  key: fs.readFileSync(CLIENT_KEY)
}

const client = mqtt.connect(MQTT_HOST, options)

let connected = false
let subscribed = false
let messageReceived = false

client.on('connect', () => {
  connected = true
  console.log('✅ Conectado al broker MQTT')
  
  console.log(`\n📥 Suscribiéndose al tópico: ${MQTT_TOPIC}`)
  client.subscribe(MQTT_TOPIC, (err) => {
    if (err) {
      console.error('❌ Error al suscribirse:', err.message)
      process.exit(1)
    } else {
      subscribed = true
      console.log('✅ Suscrito correctamente')
      console.log('\n⏳ Esperando mensajes (10 segundos)...')
      console.log('   (Puedes ejecutar el script de simulación en otra terminal)\n')
      
      // Timeout para cerrar después de 10 segundos
      setTimeout(() => {
        if (!messageReceived) {
          console.log('\n⚠️  No se recibieron mensajes en 10 segundos')
          console.log('   Esto puede ser normal si no hay dispositivos enviando datos')
        }
        client.end()
        process.exit(messageReceived ? 0 : 1)
      }, 10000)
    }
  })
})

client.on('message', (topic, message) => {
  messageReceived = true
  console.log(`\n📨 Mensaje recibido!`)
  console.log(`   Tópico: ${topic}`)
  try {
    const data = JSON.parse(message.toString())
    console.log(`   Datos:`, JSON.stringify(data, null, 2))
    console.log('\n✅ El backend puede recibir mensajes MQTT correctamente!')
    client.end()
    process.exit(0)
  } catch (err) {
    console.error('❌ Error al parsear mensaje:', err.message)
    console.log(`   Mensaje raw: ${message.toString()}`)
  }
})

client.on('error', (err) => {
  console.error('❌ Error en cliente MQTT:', err.message)
  if (err.message.includes('certificate')) {
    console.error('\n💡 Posibles causas:')
    console.error('   - Certificados incorrectos o expirados')
    console.error('   - CN del certificado no coincide con el host')
    console.error('   - Certificado no está en la lista de confianza del broker')
  } else if (err.message.includes('ECONNREFUSED')) {
    console.error('\n💡 Posibles causas:')
    console.error('   - El broker MQTT no está corriendo')
    console.error('   - El host o puerto son incorrectos')
    console.error('   - Problemas de red/firewall')
  }
  process.exit(1)
})

client.on('close', () => {
  if (connected) {
    console.log('\n🔌 Desconectado del broker')
  }
})

// Timeout general
setTimeout(() => {
  if (!connected) {
    console.error('\n❌ Timeout: No se pudo conectar en 10 segundos')
    console.error('   Verifica que:')
    console.error('   1. El broker MQTT esté corriendo')
    console.error('   2. Los certificados sean correctos')
    console.error('   3. El host y puerto sean correctos')
    client.end()
    process.exit(1)
  }
}, 10000)
