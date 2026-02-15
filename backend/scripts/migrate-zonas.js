/**
 * Script de migración: crea Zonas a partir de Dispositivo.zona existentes
 * y asigna zonaId a Dispositivos y Lecturas.
 *
 * Relación: Zona (1) → (N) Dispositivos
 * - Cada dispositivo.zona (string) se mapea a una Zona en la colección zonas
 * - Se actualiza dispositivo.zonaId con el ObjectId de la Zona
 * - Se actualiza lectura.zonaId con el zonaId del dispositivo
 *
 * Ejecutar: MONGODB_URI=mongodb://localhost:27017/smca node scripts/migrate-zonas.js
 * O desde Docker: docker exec backend node /app/scripts/migrate-zonas.js
 */

const mongoose = require('mongoose');
require('../src/db/Empresa'); // Registrar Empresa para populate
const Dispositivo = require('../src/db/Dispositivo');
const Lectura = require('../src/db/Lectura');
const Zona = require('../src/db/Zona');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://mongo:27017/smca';

async function migrateZonas() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    console.log('\n📋 Relación: Zona (1) → (N) Dispositivos');
    console.log('   Cada zona tendrá dispositivos asignados mediante zonaId (ObjectId)\n');

    const dispositivos = await Dispositivo.find().populate('empresa');
    if (dispositivos.length === 0) {
      console.log('⚠️  No hay dispositivos. Nada que migrar.');
      await mongoose.disconnect();
      process.exit(0);
      return;
    }

    // Mapa: clave "empresaId-zonaNombre" -> zonaId (ObjectId)
    const zonaMap = new Map();
    let zonasCreadas = 0;
    let zonasExistentes = 0;

    for (const d of dispositivos) {
      const empresaId = d.empresa?._id || d.empresa;
      if (!empresaId) {
        console.log(`  ⚠️  Dispositivo ${d.sensorId} sin empresa. Omitiendo.`);
        continue;
      }
      const zonaNombre = (d.zona || '').trim();
      if (!zonaNombre) {
        console.log(`  ⚠️  Dispositivo ${d.sensorId} sin zona. Omitiendo.`);
        continue;
      }
      const key = `${empresaId}-${zonaNombre}`;

      if (!zonaMap.has(key)) {
        // Buscar zona existente (mismo nombre + empresa)
        let zona = await Zona.findOne({ nombre: zonaNombre, empresaId });
        if (zona) {
          zonaMap.set(key, zona._id);
          zonasExistentes++;
          console.log(`  📍 Zona existente: ${zonaNombre} (empresa: ${d.empresa?.nombre || empresaId})`);
        } else {
          zona = new Zona({
            nombre: zonaNombre,
            empresaId,
            descripcion: `Zona migrada: ${zonaNombre}`,
            esPublica: false
          });
          await zona.save();
          zonaMap.set(key, zona._id);
          zonasCreadas++;
          console.log(`  ✅ Zona creada: ${zonaNombre} (empresa: ${d.empresa?.nombre || empresaId})`);
        }
      }
    }

    // Actualizar dispositivos con zonaId
    let updatedDispositivos = 0;
    for (const d of dispositivos) {
      const empresaId = d.empresa?._id || d.empresa;
      const zonaNombre = (d.zona || '').trim();
      if (!empresaId || !zonaNombre) continue;

      const key = `${empresaId}-${zonaNombre}`;
      const zonaId = zonaMap.get(key);
      if (zonaId && !d.zonaId) {
        await Dispositivo.updateOne({ _id: d._id }, { $set: { zonaId } });
        updatedDispositivos++;
      }
    }

    // Actualizar lecturas con zonaId (desde el dispositivo)
    let updatedLecturas = 0;
    const lecturas = await Lectura.find();
    for (const l of lecturas) {
      const dispositivo = await Dispositivo.findOne({ sensorId: l.sensorId });
      if (dispositivo?.zonaId && !l.zonaId) {
        await Lectura.updateOne({ _id: l._id }, { $set: { zonaId: dispositivo.zonaId } });
        updatedLecturas++;
      }
    }

    console.log(`\n✅ Migración completada:`);
    console.log(`   Zonas creadas: ${zonasCreadas}`);
    console.log(`   Zonas ya existentes reutilizadas: ${zonasExistentes}`);
    console.log(`   Dispositivos actualizados (zonaId): ${updatedDispositivos}`);
    console.log(`   Lecturas actualizadas (zonaId): ${updatedLecturas}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateZonas();
