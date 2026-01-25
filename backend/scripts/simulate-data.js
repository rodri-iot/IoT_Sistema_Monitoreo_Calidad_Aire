/**
 * Script para simular datos de lecturas MQTT
 * Ejecutar: node scripts/simulate-data.js
 * 
 * Simula lecturas de múltiples dispositivos con diferentes parámetros
 */

require('dotenv').config()
const mongoose = require('mongoose')
const Lectura = require('../src/db/Lectura')
const Dispositivo = require('../src/db/Dispositivo')
const Empresa = require('../src/db/Empresa')

// Configuración
const NUM_DEVICES = 5
const READINGS_PER_DEVICE = 20
const INTERVAL_MS = 1000 // 1 segundo entre lecturas

// Parámetros ambientales posibles
const PARAMETROS = {
  basic: ['pm25', 'pm10', 'temperatura', 'humedad'],
  medium: ['pm25', 'pm10', 'co2', 'temperatura', 'humedad'],
  advanced: ['pm25', 'pm10', 'no2', 'co2', 'co', 'tvoc', 'temperatura', 'humedad']
}

// Rangos de valores realistas
const RANGOS = {
  pm25: { min: 5, max: 100 },
  pm10: { min: 10, max: 150 },
  no2: { min: 10, max: 200 },
  co2: { min: 400, max: 1000 },
  co: { min: 0.5, max: 10 },
  tvoc: { min: 0, max: 500 },
  temperatura: { min: 15, max: 35 },
  humedad: { min: 30, max: 80 }
}

function randomValue(parametro) {
  const rango = RANGOS[parametro]
  return parseFloat((Math.random() * (rango.max - rango.min) + rango.min).toFixed(2))
}

async function simulateReadings() {
  try {
    // Conectar a MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/smca'
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Conectado a MongoDB')

    // Obtener o crear empresa de prueba
    let empresa = await Empresa.findOne({ nombre: 'Empresa Test' })
    if (!empresa) {
      empresa = new Empresa({ nombre: 'Empresa Test' })
      await empresa.save()
      console.log('✅ Empresa de prueba creada')
    }

    // Obtener dispositivos existentes o crear nuevos
    const dispositivos = []
    for (let i = 1; i <= NUM_DEVICES; i++) {
      const sensorId = `esp32-test-${String(i).padStart(3, '0')}`
      let dispositivo = await Dispositivo.findOne({ sensorId })
      
      if (!dispositivo) {
        // Seleccionar tipo de parámetros según el dispositivo
        const tipo = i <= 2 ? 'basic' : i <= 4 ? 'medium' : 'advanced'
        const parametros = PARAMETROS[tipo]
        
        dispositivo = new Dispositivo({
          sensorId,
          nombre: `Sensor Test ${i}`,
          zona: `Zona ${String.fromCharCode(64 + i)}`, // A, B, C, D, E
          empresa: empresa._id,
          ubicacion: {
            lat: -34.603722 + (Math.random() - 0.5) * 0.1,
            lng: -58.381592 + (Math.random() - 0.5) * 0.1
          },
          descripcion: `Dispositivo de prueba tipo ${tipo}`,
          parametrosSoportados: parametros,
          estado: 'activo'
        })
        await dispositivo.save()
        console.log(`✅ Dispositivo creado: ${sensorId} (${tipo})`)
      }
      
      dispositivos.push(dispositivo)
    }

    console.log(`\n📊 Simulando ${READINGS_PER_DEVICE} lecturas por dispositivo...\n`)

    // Simular lecturas
    for (let deviceIndex = 0; deviceIndex < dispositivos.length; deviceIndex++) {
      const dispositivo = dispositivos[deviceIndex]
      const parametros = dispositivo.parametrosSoportados || PARAMETROS.medium
      
      console.log(`📡 Dispositivo ${dispositivo.sensorId}: ${parametros.length} parámetros`)

      for (let i = 0; i < READINGS_PER_DEVICE; i++) {
        const valores = new Map()
        
        // Generar valores para cada parámetro soportado
        parametros.forEach(param => {
          valores.set(param, randomValue(param))
        })

        // Crear lectura
        const lectura = new Lectura({
          sensorId: dispositivo.sensorId,
          empresaId: dispositivo.empresa,
          dispositivoId: dispositivo._id,
          timestamp: new Date(Date.now() - (READINGS_PER_DEVICE - i) * 60000), // Últimas N horas
          zona: dispositivo.zona,
          valores: valores,
          calidad: Math.floor(Math.random() * 20) + 80, // 80-100
          metadata: {
            tipo: 'telemetria',
            fuente: 'simulacion'
          }
        })

        await lectura.save()

        // Actualizar última lectura del dispositivo
        dispositivo.ultimaLectura = lectura.timestamp
        await dispositivo.save()

        // Mostrar progreso cada 5 lecturas
        if ((i + 1) % 5 === 0) {
          process.stdout.write(`  ${i + 1}/${READINGS_PER_DEVICE} lecturas...\r`)
        }
      }
      
      console.log(`  ✅ ${READINGS_PER_DEVICE} lecturas creadas\n`)
    }

    // Resumen
    const totalLecturas = await Lectura.countDocuments({ 'metadata.fuente': 'simulacion' })
    console.log(`\n✅ Simulación completada!`)
    console.log(`   Total de lecturas simuladas: ${totalLecturas}`)
    console.log(`   Dispositivos: ${dispositivos.length}`)
    console.log(`   Empresa: ${empresa.nombre}`)

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    await mongoose.disconnect()
    process.exit(1)
  }
}

simulateReadings()
