/**
 * Script simplificado para simular lecturas de Air IoT
 * 
 * Este script:
 * 1. Verifica/crea la empresa "Air IoT" y dispositivos
 * 2. Simula lecturas MQTT para los dispositivos de Air IoT
 * 
 * Uso:
 *   node scripts/simulate-air-iot.js
 */

const { execSync } = require('child_process')
const path = require('path')

console.log('🚀 Iniciando simulación para Air IoT\n')

// Paso 1: Configurar empresa y dispositivos
console.log('📋 Paso 1: Configurando empresa "Air IoT" y dispositivos...')
try {
  execSync('node scripts/setup-air-iot.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  })
  console.log('✅ Configuración completada\n')
} catch (err) {
  console.error('❌ Error al configurar:', err.message)
  process.exit(1)
}

// Paso 2: Simular lecturas para cada dispositivo
const dispositivos = ['esp32-air-001', 'esp32-air-002', 'esp32-air-003']
const lecturasPorDispositivo = 7 // ~20 lecturas totales

console.log('📡 Paso 2: Simulando lecturas MQTT...\n')

dispositivos.forEach((sensorId, index) => {
  console.log(`\n📤 Dispositivo ${index + 1}/${dispositivos.length}: ${sensorId}`)
  
  try {
    execSync(`SENSOR_ID=${sensorId} DEVICE_ID=nodo0${(index % 4) + 1} NUM_READINGS=${lecturasPorDispositivo} INTERVAL_MS=1500 node scripts/simulate-mqtt-readings.js`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: {
        ...process.env,
        SENSOR_ID: sensorId,
        DEVICE_ID: `nodo0${(index % 4) + 1}`,
        NUM_READINGS: lecturasPorDispositivo.toString(),
        INTERVAL_MS: '1500'
      }
    })
  } catch (err) {
    console.error(`⚠️  Error al simular ${sensorId}:`, err.message)
  }
  
  // Pequeña pausa entre dispositivos
  if (index < dispositivos.length - 1) {
    console.log('\n⏳ Esperando 2 segundos antes del siguiente dispositivo...\n')
    // No hay sleep en Node, pero podemos usar setTimeout en una función async
  }
})

console.log('\n✅ Simulación completada para Air IoT!')
console.log('\n💡 Próximos pasos:')
console.log('   1. Inicia sesión con: admin@airiot.com / admin123')
console.log('   2. Ve al Dashboard para ver las lecturas')
console.log('   3. Las lecturas deberían aparecer automáticamente')
